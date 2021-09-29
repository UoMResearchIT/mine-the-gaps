from django.shortcuts import render
from django.contrib.gis.geos import MultiPolygon, Polygon, Point
from django.http import JsonResponse
from django.http import HttpResponseRedirect
from django.http import HttpResponse, HttpResponseServerError
from django.views.decorators.csrf import ensure_csrf_cookie

from django.core.files import temp as tempfile
from django.conf import settings
from django.core.files.storage import default_storage

from slugify import slugify
import csv
import json
import pandas as pd
import os
from io import TextIOWrapper
from shapely import wkt

from mine_the_gap.forms import FileUploadForm
from mine_the_gap.models import Actual_data, Actual_value, Estimated_data, Region, Sensor, Filenames, Estimated_value
from django.db.models import Max, Min, Avg, StdDev
from region_estimators import RegionEstimatorFactory, EstimationData

prev_site_params = []
prev_measurement = None
estimators_dict = {}


class ProgressUpdate(object):

    def __init__(self):
        self._progress_json = {}

    @property
    def progress_json(self):
        return self._progress_json

    @progress_json.setter
    def progress_json(self, value={}):
        self._progress_json = value

    def process_estimations_progress(self, percent_complete, status):
        self._progress_json = {'percent_complete': percent_complete,
                         'status': 'Obtaining estimates',
                         'sub_status': status}
        print(json.dumps(self._progress_json))


progress_update = ProgressUpdate()


def get_progress(request):
    return JsonResponse(progress_update.progress_json)


@ensure_csrf_cookie
def home_page(request):
    if request.method == 'POST':
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            handle_uploaded_files(request)
            filenames = Filenames.objects.first()
            if not filenames:
                filenames = Filenames()
            try:
                if form.cleaned_data.get("site_metadata_file"):
                    filenames.site_metadata_filename = form.cleaned_data.get("site_metadata_file")
                if form.cleaned_data.get("actual_data_file"):
                    filenames.actual_data_filename = form.cleaned_data.get("actual_data_file")
                if form.cleaned_data.get("region_metadata_file"):
                    filenames.region_metadata_filename = form.cleaned_data.get("region_metadata_file")
                if form.cleaned_data.get("estimated_data_file"):
                    filenames.estimated_data_filename = form.cleaned_data.get("estimated_data_file")
                filenames.save()
            except Exception as err:
                print('Error uploading files:', str(err))

            return HttpResponseRedirect(request.path_info)
        else:
            return render(request, 'index.html', {'form': form})

    context = {'form': FileUploadForm(),
               'filepaths': Filenames.objects.all()}
    return render(request, 'index.html', context)


def initialise(request):
    global progress_update

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Initialising',
                                     'sub_status': 'Step 1 of 5 - Getting center location'}
    center_latlng = json.loads(get_center_latlng())
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Initialising',
                                     'sub_status': 'Step 2 of 5 - Getting measurement names'}
    measurement_names = get_measurement_names()
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Initialising',
                                     'sub_status': 'Step 3 of 5 - Getting available methods'}
    method_names = list(RegionEstimatorFactory.get_available_methods())
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Initialising',
                                     'sub_status': 'Step 4 of 5 - Getting timestamp list'}
    timestamp_list = get_timestamp_list()
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Initialising',
                                     'sub_status': 'Step 5 of 5 - rendering page'}

    context = {'center': center_latlng,
               'measurement_names': measurement_names,
               'method_names': method_names,
               'timestamp_list': timestamp_list}
    progress_update.progress_json = {}

    return JsonResponse(context)

def get_site_fields(request):
    result = []

    try:
        # Check sites exist
        first_site = Sensor.objects.first()

        if first_site:
            # Sensors exist so get field names from the Sensor model
            for field in Sensor._meta.get_fields():
                if not (field.many_to_one) and field.related_model is None:
                    field_name = field.name

                    if field_name == 'id' or field_name == 'geom':
                        continue
                    elif field_name == 'extra_data':
                        result.extend(first_site.extra_data.keys())
                    else:
                        result.append(field_name)

        # print(str(result))
        response = JsonResponse(result, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response


def get_actuals(request, measurement, timestamp_val=None, site_id=None):
    try:
        data = actuals(request, measurement, timestamp_val=timestamp_val, site_id=site_id, return_all_fields=False)
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response

def get_estimates(request, method_name, measurement, timestamp_val=None, region_id=None):
    try:
        data = estimates(
            request,
            method_name,
            measurement,
            timestamp_val=timestamp_val,
            region_id=region_id,
            return_all_fields=False)
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response


def get_all_data_at_timestamp(request, method_name, measurement=None, timestamp_val=None,):
    try:
        data = {
            'actual_data': actuals(request, measurement, timestamp_val=timestamp_val, return_all_fields=True),
            'estimated_data': estimates(request, method_name, measurement, timestamp_val=timestamp_val,
                                        return_all_fields=True)
        }
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)

    finally:
        return response


def get_all_regions_at_timestamp(request, method_name, measurement=None, timestamp_val=None,):
    try:
        data = {
            'estimated_data': estimates(request, method_name, measurement, timestamp_val=timestamp_val,
                                        return_all_fields=True)
        }
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)

    finally:
        return response

def get_all_sites_at_timestamp(request, measurement=None, timestamp_val=None,):
    try:
        data = {
            'actual_data': actuals(request, measurement, timestamp_val=timestamp_val, return_all_fields=True),
        }
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)

    finally:
        return response


def get_all_timeseries_at_region(request, method_name, measurement, region_id, site_id):
    try:
        data = {
            'actual_data': actuals(request, measurement, site_id=site_id, return_all_fields=True),
            'estimated_data': estimates(request, method_name, measurement, region_id=region_id, return_all_fields=True)
        }
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response


def get_actuals_timeseries(request, measurement, site_id=None):
    try:
        data = actuals(request, measurement, timestamp_val=None, site_id=site_id, return_all_fields=False)
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response


def get_estimates_timeseries(request, method_name, measurement, region_id=None, ignore_site_id=None):
    if ignore_site_id is None:
        ignore_list = []
    else:
        ignore_list = [ignore_site_id]
    try:
        data = estimates(
            request,
            method_name,
            measurement,
            timestamp_val=None,
            region_id=region_id,
            return_all_fields=False,
            ignore_site_ids=ignore_list)
        response = JsonResponse(data, safe=False)
    except Exception as err:
        response = JsonResponse({'status': 'false', 'message': str(err)}, status=500)
    finally:
        return response


def get_sites_file(request, file_type=None):
    # Create the HttpResponse object with the appropriate CSV header.
    if file_type == 'csv':
        response = get_csv_response(Filenames.objects.first().site_metadata_filename, 'sites_metadata.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().site_metadata_filename),
                                     'sites_metadata.json',
                                     file_type)
    return response


def get_regions_file(request, file_type=None):
    # Create the HttpResponse object with the appropriate CSV header.
    if file_type == 'csv':
        response = get_csv_response(Filenames.objects.first().region_metadata_filename, 'regions_metadata.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().region_metadata_filename),
                                     'regions_metadata.json',
                                     file_type)
    return response


def get_actuals_file(request, file_type=None):
    if file_type == 'csv':
        response = get_csv_response(Filenames.objects.first().actual_data_filename, 'sites_data.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().actual_data_filename),
                                     'sites_data.json',
                                     file_type)
    return response

def get_estimates_file(request, file_type=None):
    if file_type == 'csv':
        response = get_csv_response(Filenames.objects.first().estimated_data_filename, 'regions_estimates.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().estimated_data_filename),
                                     'regions_estimates.json',
                                     file_type)
    return response

def get_csv_response(stored_filename, new_filename):
    try:
        csv_file = default_storage.open(stored_filename)
        response = HttpResponse(csv_file, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="' + new_filename + '"'
    except Exception as err:
        response = HttpResponseServerError('Unable to retrieve csv from file: ' + stored_filename + ':' + str(err))

    return response

def get_json_response(stored_filename, new_filename, file_type):
    try:
        csv_file = pd.DataFrame(pd.read_csv(stored_filename, sep=",",
                                header=0, index_col=False))
        csv_file.to_json(os.path.join(tempfile.gettempdir(), 'temp.json'), orient="records", date_format="epoch",
                         double_precision=10,
                         force_ascii=True, date_unit="ms", default_handler=None)
        with open(os.path.join(tempfile.gettempdir(), 'temp.json')) as json_file:
            if file_type == 'json':
                response = HttpResponse(json_file, content_type='text/json')
                response['Content-Disposition'] = 'attachment; filename="' + new_filename + '"'
            else:
                response = JsonResponse(json.load(json_file), safe=False)
        os.remove(os.path.join(tempfile.gettempdir(), 'temp.json'))
    except Exception as err:
        response = HttpResponseServerError('Unable to retrieve json from file: ' + stored_filename + ':' + str(err))

    return response


def actuals(request, measurement, timestamp_val=None, site_id=None, return_all_fields=True):
    global progress_update

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Obtaining actuals',
                                     'sub_status': 'Initialising variables'}

    data = []
    measurement = measurement.strip()
    if len(measurement) == 0:
        progress_update.progress_json = {'percent_complete': None,
                                         'status': None,
                                         'sub_status': None}
        return data

    try:
        site_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        site_params = []

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Obtaining actuals',
                                     'sub_status': 'Querying database'}

    if timestamp_val and site_id:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__timestamp=str(timestamp_val),
                                                actual_data__site_id=site_id)
    elif timestamp_val:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__timestamp=str(timestamp_val))\
            .order_by('actual_data__site_id')
    elif site_id:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__site_id=site_id)\
            .order_by('actual_data__timestamp')
    else:
        query_set = Actual_value.objects.filter(measurement_name=measurement) \
            .order_by('actual_data__site_id', 'actual_data__timestamp')

    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']

    mean_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Avg('value'))['value__avg']
    std_dev = Actual_value.objects.filter(measurement_name=measurement).aggregate(StdDev('value'))['value__stddev']

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Obtaining actuals',
                                     'sub_status': 'Calculating scores'}
    for row in query_set.iterator():
        percentage_score = calculate_percentage_score(row.value, min_val, max_val)
        z_score = calculate_z_score(row.value, mean_val, std_dev)
        new_row = dict(row.join_site) if return_all_fields else dict(row.join_site_lite)
        new_row['ignore'] = False if select_site(new_row, site_params) else True
        new_row['percent_score'] = percentage_score
        new_row['z_score'] = z_score
        new_row['min'] = min_val
        new_row['max'] = max_val
        new_row['mean'] = mean_val
        new_row['std_dev'] = std_dev
        data.append(new_row)

    progress_update.progress_json = {'percent_complete': None,
                                     'status': None,
                                     'sub_status': None}

    return data

def calculate_percentage_score(value, min, max):
    try:
        return round((value - min) / (max - min), 2)
    except:
        return None

def calculate_z_score(value, mean, standard_deviation):
    try:
        return round((value - mean) / standard_deviation, 2)
    except:
        return None

def load_region_estimators(measurement, site_params=[]):
    global estimators_dict, prev_site_params, prev_measurement, progress_update

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading region estimators',
                                     'sub_status': 'Beginning'}

    ### Sites ###
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading region estimators',
                                     'sub_status': 'Loading sites'}
    prev_site_params = site_params
    if site_params is not None:
        sites = filter_sites(Sensor.objects.all(), site_params)
    else:
        sites = Sensor.objects.all()

    df_sites = pd.DataFrame.from_records(sites.values('id', 'geom', 'name'), index='id')
    df_sites['latitude'] = df_sites.apply(lambda row: row.geom.y, axis=1)
    df_sites['longitude'] = df_sites.apply(lambda row: row.geom.x, axis=1)
    df_sites = df_sites.drop(columns=['geom'])
    df_sites = df_sites.reset_index()
    df_sites['site_id'] = df_sites['name']
    df_sites.drop(columns=['name'], inplace=True)
    df_sites.set_index('site_id', inplace=True)
    df_sites.rename(columns={'id': 'site'}, inplace=True)

    ### Regions ###
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading region estimators',
                                     'sub_status': 'Loading regions'}
    regions = Region.objects.all()
    df_regions = pd.DataFrame.from_records(regions.values('region_id', 'geom'), index='region_id')
    # convert regions geometry (multipolygone) into a universal format (wkt) for use in region_estimations package
    df_regions['geometry'] = df_regions.apply(lambda row: wkt.loads(row.geom.wkt), axis=1)
    df_regions = df_regions.drop(columns=['geom'])

    ### Actuals ###
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading region estimators',
                                     'sub_status': 'Loading actuals data'}
    prev_measurement = measurement
    df_actual_data = pd.DataFrame.from_records(Actual_data.objects.all().values('id', 'site', 'timestamp'), index='id')
    df_actual_values = pd.DataFrame.from_records(
        Actual_value.objects.filter(measurement_name=measurement).values('actual_data', 'value'))
    df_actuals = df_actual_values.merge(df_actual_data, left_on='actual_data', right_index=True).drop(
        columns=['actual_data'])
    # Merge with sites to get 'site_id' (string); (as opposed to 'site' (int), which is the Sensor model's ID field
    #  (but need to merge on 'site')
    df_actuals = df_actuals.merge(df_sites.reset_index(), on='site')
    df_actuals.drop(columns=['latitude', 'longitude', 'site'], inplace=True)
    df_actuals = df_actuals.rename(columns={"value": measurement})
    df_sites.drop(columns=['site'], inplace=True)

    estimators_dict = {}
    available_methods = RegionEstimatorFactory.get_available_methods()
    for idx, method_name in enumerate(available_methods):
        progress_update.progress_json = {'percent_complete': None,
                                         'status': 'Loading region estimators',
                                         'sub_status': 'Initialising class for ' + method_name}
        estimators_dict[method_name] = RegionEstimatorFactory.region_estimator(
            method_name,
            EstimationData(df_sites, df_regions, df_actuals, verbose=0),
            verbose=0,
            max_processors=settings.MAX_NUM_PROCESSORS,
            progress_callback=progress_update.process_estimations_progress)


def estimates(request, method_name, measurement, timestamp_val=None, region_id=None, return_all_fields=False,
              ignore_site_ids=[]):
    global estimators_dict, prev_site_params, prev_measurement, progress_update

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Obtaining estimates',
                                     'sub_status': 'Initialising variables'}

    data = []
    method_name = method_name.strip()
    if method_name == 'undefined':
        progress_update.progress_json = {'percent_complete': None,
                                         'status': None,
                                         'sub_status': None}
        return data
    measurement = measurement.strip()
    if len(measurement) == 0:
        progress_update.progress_json = {'percent_complete': None,
                                         'status': None,
                                         'sub_status': None}
        return data
    try:
        site_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        site_params = []

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Obtaining estimates',
                                     'sub_status': 'Getting min / max values'}

    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']
    mean_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Avg('value'))['value__avg']
    std_dev = Actual_value.objects.filter(measurement_name=measurement).aggregate(StdDev('value'))['value__stddev']

    if method_name == 'file':
        progress_update.progress_json = {'percent_complete': None,
                                         'status': 'Obtaining estimates',
                                         'sub_status': 'Getting estimates from pre-loaded data'}
        if timestamp_val and region_id:
            query_set = Estimated_value.objects.filter(measurement_name=measurement,
                                                       estimated_data__timestamp=str(timestamp_val),
                                                       estimated_data__region_id=region_id)\
                .order_by('estimated_data__region_id','estimated_data__timestamp')

        elif timestamp_val:
            query_set = Estimated_value.objects.filter(measurement_name=measurement,
                                                       estimated_data__timestamp=str(timestamp_val))\
                .order_by('estimated_data__region_id', 'estimated_data__timestamp')
        elif region_id:
            query_set = Estimated_value.objects.filter(measurement_name=measurement,
                                                       estimated_data__region_id=region_id)\
                .order_by('estimated_data__region_id','estimated_data__timestamp')
        else:
            query_set = Estimated_value.objects.filter(measurement_name=measurement)\
                .order_by('estimated_data__region_id','estimated_data__timestamp', 'measurement_name')

        for row in query_set.iterator():
            percentage_score = calculate_percentage_score(row.value, min_val, max_val)
            z_score = calculate_z_score(row.value, mean_val, std_dev)

            new_row = dict(row.join_region) if return_all_fields else dict(row.join_region_lite)
            new_row['percent_score'] = percentage_score
            new_row['method_name'] = method_name
            new_row['z_score'] = z_score
            new_row['min'] = min_val
            new_row['max'] = max_val
            new_row['mean'] = mean_val
            new_row['std_dev'] = std_dev
            data.append(new_row)
    else:
        progress_update.progress_json = {'percent_complete': None,
                                         'status': 'Obtaining estimates',
                                         'sub_status': 'Calculating estimates'}
        # Create pandas dataframes for input into region estimators.
        if estimators_dict == {}:
            print('reloading due to empty estimators_dict')
            load_region_estimators(measurement, site_params)
        elif site_params != prev_site_params:
            print('reloading due to site_params change')
            load_region_estimators(measurement, site_params)
        elif measurement != prev_measurement:
            print('reloading due to measurement change')
            load_region_estimators(measurement, site_params)

        # Due to using url requests, we had to use site IDs (ints) rather than site names,
        #  so converting ignore list to site names
        progress_update.progress_json = {'percent_complete': None,
                                         'status': 'Obtaining estimates',
                                         'sub_status': 'Converting site IDs'}
        for idx, site_id in enumerate(ignore_site_ids):
            ignore_site_ids[idx] = Sensor.objects.get(id=site_id).name

        try:
            progress_update.progress_json = {'percent_complete': None,
                                             'status': 'Obtaining estimates',
                                             'sub_status': 'Calling region_estimators package'}
            df_result = estimators_dict[method_name].get_estimations(measurement, region_id, timestamp_val,
                                                                     ignore_site_ids)
        except Exception as err:
            print(str(err))
        else:
            progress_update.progress_json = {'percent_complete': None,
                                             'status': 'Obtaining estimates',
                                             'sub_status': 'Calculating scores'}
            for index, row in df_result.iterrows():
                if not pd.isna(row['value']):
                    value = row['value']
                else:
                    value = None
                percentage_score = calculate_percentage_score(value, min_val, max_val)
                z_score = calculate_z_score(value, mean_val, std_dev)

                # We get region_id and timestamp from index, check that index is in the expected order
                # As had to use numeric indexes rather than labels.
                assert df_result.index.names == ['measurement', 'region_id', 'timestamp'], \
                    "RegionEstimator results index columns not as expected. \n Expected: \n{} \n Actual: \n{}".format(
                        ['measurement', 'region_id', 'timestamp'], df_result.index.names
                    )
                data.append(    {'region_id': row.name[1],  # region_id and timestamp are in the index of RE result df
                                 'timestamp': row.name[2],
                                 'value': value,
                                 'percent_score': percentage_score,
                                 'z_score': z_score,
                                 'min': min_val,
                                 'max': max_val,
                                 'mean': mean_val,
                                 'std_dev': std_dev,
                                 'method_name': method_name,
                                 'extra_data': json.loads(row['extra_data'])
                                 })
        #print('result data:')
        #print(data)

    progress_update.progress_json = {'percent_complete': None,
                                     'status': None,
                                     'sub_status': None}
    return data


def select_site(site, params):
    # [{"name": {"omit_sites": ["Inverness"]}}]
    # [{"name": {"select_sites": ["Inverness"]}}]
    for item in params:
        item_key = next(iter(item))
        if item_key == 'name':
            site_field = site['name']
        else:
            site_field = site['site_extra_data'][item_key]

        dict_item = item[item_key]
        if dict_item and 'select_sites' in dict_item and site_field not in dict_item['select_sites']:
            return False
        if dict_item and 'omit_sites' in dict_item and site_field in dict_item['omit_sites']:
            return False

    return True

def filter_sites(sites, params):
    # [{"name": {"omit_sites": ["Inverness"]}}]
    # [{"pc": {"select_sites": ["kdljdflja"]}}]

    for item in params:
        item_key = next(iter(item))
        dict_selector = item[item_key]
        omit_or_select = next(iter(dict_selector))
        include = True if omit_or_select == 'select_sites' else False
        values = item[item_key][omit_or_select]

        if item_key == 'name':
            if include:
                sites = sites.filter(name__in=values)
            else:
                sites = sites.exclude(name__in=values)
        else:
            for value in values:
                if include:
                    sites = sites.filter(extra_data__contains={item_key: value})
                else:
                    sites = sites.exclude(extra_data__contains={item_key: value})

    return sites


def get_measurement_names():
    query_set = Actual_value.objects.order_by('measurement_name').values('measurement_name').distinct()
    result = []

    for idx, item in enumerate(query_set):
        result.append(item['measurement_name'])

    return result


def get_timestamp_list():
    query_set = Actual_data.objects.order_by('timestamp').values('timestamp').distinct()
    result = []

    for idx, item in enumerate(query_set):
        # e.g.: {'timestamp': datetime.date(2017, 1, 1)}
        result.append(item['timestamp'])

    return result


def get_center_latlng():
    x_average = 0
    y_average = 0
    found=False

    for idx, site in enumerate(Sensor.objects.all()):
        found = True
        x_average = x_average * (idx / (idx + 1)) + site.geom.coords[0] / (idx + 1)
        y_average = y_average * (idx / (idx + 1)) + site.geom.coords[1] / (idx + 1)

    if found:
        return json.dumps([str(y_average), str(x_average)])
    else:
        return json.dumps(["54.2361", "-4.5481"])  # UK default


def handle_uploaded_files(request):
    print('request.FILES:\n{}'.format(request.FILES))
    #If empty: request.FILES:
    #          <MultiValueDict: {}>

    # Use can upload actual data and/or estimated data (but in each case both data and meta-data files must be input)
    upload_actual_data(request)
    upload_estimated_data(request)

def upload_actual_data(request):
    global progress_update
    try:
        filepath_site = request.FILES['site_metadata_file']
        filepath_actual = request.FILES['actual_data_file']
    except Exception as err:
        return

    Actual_value.objects.all().delete()
    Actual_data.objects.all().delete()
    Sensor.objects.all().delete()

    file_sites = TextIOWrapper(filepath_site.file, encoding=request.encoding)
    reader = csv.reader(file_sites)
    # skip/get the headers
    field_titles = next(reader, None)

    extra_field_idxs = []
    site_id_idx = None
    lat_idx = None
    long_idx = None

    # Find the fields in the sites file
    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading actuals',
                                     'sub_status': 'Loading sites metadata file'}

    for idx, title in enumerate(field_titles):
        title = title.strip().lower()
        if title == 'longitude':
            long_idx = idx
        elif title == 'latitude':
            lat_idx = idx
        elif title == 'site_id':
            site_id_idx = idx
        else:
            extra_field_idxs.append(idx)
    try:
        for row in reader:
            try:
                extra_data = {}
                for idx in extra_field_idxs:
                    item = field_titles[idx]
                    extra_data[item] = row[idx]
                point_loc = Point(x=float(row[long_idx]), y=float(row[lat_idx]))
                site, created = Sensor.objects.get_or_create(
                    geom=point_loc,
                    name=row[site_id_idx],
                    extra_data=extra_data)
                site.save()
            except Exception as err:
                print('Error loading site:', err)
                continue
    except Exception as err:
        print('Error reading sites file:', err)
        return

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading actuals',
                                     'sub_status': 'Loading actuals data file'}

    file_actual = TextIOWrapper(filepath_actual.file, encoding=request.encoding)
    reader = csv.reader(file_actual)
    # skip/get the headers
    field_titles = next(reader, None)
    row_count = reader.line_num

    value_idxs = []
    timestamp_idx = None
    site_id_idx = None

    # Find the fields in the file
    for idx, title in enumerate(field_titles):
        title = title.strip().lower()
        if title.startswith('val_'):
            value_idxs.append(idx)
        elif (title == 'time_stamp') or (title == 'timestamp'):
            timestamp_idx = idx
        elif title == 'site_id':
            site_id_idx = idx

    # Read in the data
    try:
        line_no = 0
        for row in reader:
            line_no += 1
            progress_update.progress_json = {'percent_complete': (line_no / row_count)*100,
                                             'status': 'Loading actuals',
                                             'sub_status': 'Loading actuals data file'}
            try:
                site_id = row[site_id_idx]

                try:
                    site = Sensor.objects.get(name=site_id)
                except Exception as err:
                    print('Site', site_id, 'not returned for this actual datapoint, due to:', err)
                else:
                    if site:
                        actual = Actual_data(   timestamp=slugify(row[timestamp_idx]),
                                                site=site)
                        actual.save()

                        #print('Value indexes: {}'.format(value_idxs))
                        for idx in value_idxs:
                            slug_val = slugify(str(row[idx]))
                            if slug_val == 'missing':  #IMPORTANT: DO NOT TRY TO CATER FOR EMPTY STRINGS AS THESE SHOULD
                                fvalue = None
                            elif slug_val == '':
                                continue
                            else:
                                #print('Obtaining value ({}) in field {} as float.'.format(row[idx], field_titles[idx]))
                                try:
                                    fvalue = float(row[idx])
                                except Exception as err:
                                    continue
                            try:
                                #print('Adding value ({}) in field {} as float.'.format(fvalue, field_titles[idx]))
                                name = slugify(field_titles[idx].replace('val_', '', 1), lowercase=True, separator='_')
                                actual_value = Actual_value(    measurement_name=name,
                                                                value = fvalue,
                                                                actual_data = actual)
                                actual_value.save()
                            except Exception as err:
                                # value could not be added
                                print('Error adding value ({}) in field {} as float. {}'.format(fvalue, field_titles[idx], err))

            except Exception as err:
                print('Error loading actuals:', err)
                continue
    except Exception as err:
        print('Error reading actuals file:', err)
        return

    default_storage.save(filepath_site.name, filepath_site.file)
    default_storage.save(filepath_actual.name, filepath_actual.file)

def upload_estimated_data(request):
    global progress_update
    try:
        filepath_estimated = request.FILES['estimated_data_file']
        filepath_region = request.FILES['region_metadata_file']
    except Exception as err:
        return

    Estimated_value.objects.all().delete()
    Estimated_data.objects.all().delete()
    Region.objects.all().delete()

    file_regions = TextIOWrapper(filepath_region.file, encoding=request.encoding)
    reader = csv.reader(file_regions)
    # skip/get the headers
    field_titles = next(reader, None)
    #print('field titles:', field_titles)

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading estimates',
                                     'sub_status': 'Loading regions metadata file'}

    try:
        for row in reader:
            try:
                extra_data = {}
                for idx, item in enumerate(field_titles[2:]):
                    extra_data[item] = row[idx + 2]
                # Initialise polys
                multipoly_geo = MultiPolygon()
                poly = ()

                # Split the row
                poly_split = row[1].split(' ')[1:]

                # make first_point
                point_split = poly_split[0].strip().split(',')
                try:
                    first_point = (float(point_split[0]), float(point_split[1]))
                except:
                    continue

                start = True
                for point_str in poly_split:
                    point_split = point_str.strip().split(',')
                    point = (float(point_split[0]), float(point_split[1]))
                    poly = poly + (point,)
                    if start != True and point == first_point:
                        # Restart as enclosed circle found
                        # Make an enclosed circle
                        poly_geo = Polygon(poly)
                        multipoly_geo.append(poly_geo)
                        poly = ()
                        start = True
                    else:
                        start = False

                region = Region(region_id=str(row[0]),
                                geom=multipoly_geo,
                                extra_data=extra_data
                                )

                print("Saving a region")
                region.save()
            except Exception as err1:
                #print('Region file error. ', err1)
                #print('Region file error. Row: ', row[0])
                continue
    except Exception as err:
        print('Error reading regions file:', err)
        return

    progress_update.progress_json = {'percent_complete': None,
                                     'status': 'Loading estimates',
                                     'sub_status': 'Loading estimates data file'}

    file_estimates = TextIOWrapper(filepath_estimated.file, encoding=request.encoding)
    reader = csv.reader(file_estimates)
    # skip/get the headers
    field_titles = next(reader, None)
    print('field titles:', field_titles)
    row_count = reader.line_num

    value_idxs = []
    extra_field_idxs = []
    timestamp_idx = 0
    region_idx = ''

    # Find the fields in the file
    for idx, title in enumerate(field_titles):
        title = title.strip().lower()
        if title.startswith('val_'):
            value_idxs.append(idx)
        elif (title == 'time_stamp') or (title == 'timestamp'):
            timestamp_idx = idx
        elif (title == 'region') or (title=='region_id'):
            region_idx = idx
        elif title.startswith('extra_'):
            extra_field_idxs.append(idx)

    extra_data_idxs = {}
    for extra_idx in extra_field_idxs:
        # 'extra_rings_Platanus_max'
        field_name = field_titles[extra_idx].replace('extra_', '', 1)
        # 'rings_Platanus_max'
        extra_data_field = field_name.split('_')[0]  # 'rings'
        measurement_name = slugify(field_name.replace(extra_data_field + '_', '', 1), lowercase=True, separator='_')
        # 'Platanus_max'
        if measurement_name not in extra_data_idxs:
            extra_data_idxs[measurement_name] = {}
        extra_data_idxs[measurement_name][extra_data_field] = extra_idx


    try:
        line_no = 0
        for row in reader:
            line_no += 1
            progress_update.progress_json = {'percent_complete': (line_no / row_count) * 100,
                                             'status': 'Loading estimates',
                                             'sub_status': 'Loading estimates data file'}
            try:
                region = Region.objects.get(region_id=str(row[region_idx]))

                if region:
                    estimated = Estimated_data( timestamp=slugify(row[timestamp_idx]),
                                                region=region
                                                )
                    estimated.save()

                    for idx in value_idxs:
                        name = slugify(field_titles[idx].replace('val_', '', 1), lowercase=True, separator='_')

                        # Get extra data fields
                        extra_data = {}
                        try:
                            extra_idxs = extra_data_idxs[name]
                            for extra_data_name, extra_data_idx in extra_idxs.items():
                                extra_data[extra_data_name] = row[extra_data_idx]
                        except:
                            pass

                        # Check that the name has a matching site measurement
                        #  and add to model if it has.
                        #if name in site_measurements:
                        try:
                            fvalue = float(row[idx])
                        except:
                            fvalue = None

                        actual_value = Estimated_value( measurement_name=name,
                                                        value = fvalue,
                                                        estimated_data = estimated,
                                                        extra_data=extra_data,
                        )
                        actual_value.save()


            except Exception as err:
                print('Estimate file error: ', err, 'Region_ID:' + str(row[1]))
                continue
    except Exception as err:
        print('Error reading estimated file:', err)
        return

    default_storage.save(filepath_region.name, filepath_region.file)
    default_storage.save(filepath_estimated.name, filepath_estimated.file)