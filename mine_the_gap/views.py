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


from mine_the_gap.forms import FileUploadForm
from mine_the_gap.models import Actual_data, Actual_value, Estimated_data, Region, Sensor, Filenames, Estimated_value
from django.db.models import Max, Min
from mine_the_gap.region_estimators.region_estimator_factory import Region_estimator_factory

@ensure_csrf_cookie
def home_page(request):
    if request.method == 'POST':
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            handle_uploaded_files(request)
            filenames = Filenames.objects.first()
            if not filenames:
                filenames = Filenames()

            if form.cleaned_data.get("sensor_data_file"):
                filenames.sensor_data_filename = form.cleaned_data.get("sensor_data_file")
            if form.cleaned_data.get("actual_data_file"):
                filenames.actual_data_filename = form.cleaned_data.get("actual_data_file")
            if form.cleaned_data.get("region_data_file"):
                filenames.region_data_filename = form.cleaned_data.get("region_data_file")
            if form.cleaned_data.get("estimated_data_file"):
                filenames.estimated_data_filename = form.cleaned_data.get("estimated_data_file")
            filenames.save()

            return HttpResponseRedirect(request.path_info)

    context = { 'form': FileUploadForm(),
                'center': get_center_latlng(),
                'filepaths': Filenames.objects.all(),
                'measurement_names': get_measurement_names(),
                'timestamp_range': get_timestamp_list()}

    return render(request, 'index.html', context)





def get_sensor_fields(request):
    result = []

    # Check sensors exist
    first_sensor = Sensor.objects.first()

    if first_sensor:
        # Sensors exist so get field names from the Sensor model
        for field in Sensor._meta.get_fields():
            if not (field.many_to_one) and field.related_model is None:
                field_name = field.name

                if field_name == 'id' or field_name == 'geom':
                    continue
                elif field_name == 'extra_data':
                    result.extend(first_sensor.extra_data.keys())
                else:
                    result.append(field_name)

    #print(str(result))
    return JsonResponse(result, safe=False)


def get_all_data_at_timestamp(request, method_name, timestamp_idx, measurement):
    data = {
                'actual_data': actuals_at_timestamp(request, timestamp_idx, measurement),
                'estimated_data': estimates_at_timestamp(request, method_name, timestamp_idx, measurement)
    }
    return JsonResponse(data, safe=False)

def get_actuals_at_timestamp(request, timestamp_idx, measurement):
    data = actuals_at_timestamp(request, timestamp_idx, measurement)
    return JsonResponse(data, safe=False)

def get_estimates_at_timestamp(request, method_name, timestamp_idx, measurement):
    data = estimates_at_timestamp(request, method_name, timestamp_idx, measurement)
    return JsonResponse(data, safe=False)



def get_sensors_file(request, file_type):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        if file_type.lower() == 'csv':
            #  Reading file from storage
            csv_file = default_storage.open(
                Filenames.objects.first().sensor_data_filename)  # 'x') #force error for testing
            response = HttpResponse(csv_file, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="sensor_metadata.csv"'
        elif file_type.lower() == 'json':
            csv_file = pd.DataFrame(
                pd.read_csv(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().sensor_data_filename), sep=",",
                            header=0, index_col=False))
            csv_file.to_json(os.path.join(tempfile.gettempdir(), 'temp.json'), orient="records", date_format="epoch", double_precision=10,
                             force_ascii=True, date_unit="ms", default_handler=None)
            with open(os.path.join(tempfile.gettempdir(), 'temp.json')) as json_file:
                response = HttpResponse(json_file, content_type='text/json')
            os.remove(os.path.join(tempfile.gettempdir(), 'temp.json'))
            response['Content-Disposition'] = 'attachment; filename="sensor_metadata.json"'

    except Exception as err:
        response =  HttpResponseServerError('Unable to open sensor metadata file: ' + str(err))

    return response


def get_regions_file(request, file_type):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        if file_type.lower() == 'csv':
            #  Reading file from storage
            csv_file = default_storage.open(Filenames.objects.first().region_data_filename)
            response = HttpResponse(csv_file, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="region_metadata.csv"'
        elif file_type.lower() == 'json':
            csv_file = pd.DataFrame(
                pd.read_csv(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().region_data_filename), sep=",",
                            header=0, index_col=False))
            csv_file.to_json(os.path.join(tempfile.gettempdir(), 'temp.json'), orient="records", date_format="epoch", double_precision=10,
                             force_ascii=True, date_unit="ms", default_handler=None)
            with open(os.path.join(tempfile.gettempdir(), 'temp.json')) as json_file:
                response = HttpResponse(json_file, content_type='text/json')
            os.remove(os.path.join(tempfile.gettempdir(), 'temp.json'))
            response['Content-Disposition'] = 'attachment; filename="region_metadata.json"'
    except Exception as err:
        response = HttpResponseServerError('Unable to open region metadata file: ' + str(err))

    return response


def get_actuals_file(request, file_type):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        if file_type.lower() == 'csv':
            #  Reading file from storage
            csv_file = default_storage.open(Filenames.objects.first().actual_data_filename)
            response = HttpResponse(csv_file, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="sensor_data.csv"'
        elif file_type.lower() == 'json':
            csv_file = pd.DataFrame(
                pd.read_csv(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().actual_data_filename), sep=",",
                            header=0, index_col=False))
            csv_file.to_json(os.path.join(tempfile.gettempdir(), 'temp.json'), orient="records", date_format="epoch", double_precision=10,
                             force_ascii=True, date_unit="ms", default_handler=None)
            with open(os.path.join(tempfile.gettempdir(), 'temp.json')) as json_file:
                response = HttpResponse(json_file, content_type='text/json')
            os.remove(os.path.join(tempfile.gettempdir(), 'temp.json'))
            response['Content-Disposition'] = 'attachment; filename="sensor_data.json"'
    except Exception as err:
        response = HttpResponseServerError('Unable to open sensor data file: ' + str(err))

    return response

def get_estimates_file(request, file_type):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        if file_type.lower() == 'csv':
            #  Reading file from storage
            csv_file = default_storage.open(Filenames.objects.first().estimated_data_filename)
            response = HttpResponse(csv_file, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="region_estimated_data.csv"'
        elif file_type.lower() == 'json':
            csv_file = pd.DataFrame(
                pd.read_csv(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().estimated_data_filename), sep=",",
                            header=0, index_col=False))
            csv_file.to_json(os.path.join(tempfile.gettempdir(), 'temp.json'), orient="records", date_format="epoch", double_precision=10,
                             force_ascii=True, date_unit="ms", default_handler=None)
            with open(os.path.join(tempfile.gettempdir(), 'temp.json')) as json_file:
                response = HttpResponse(json_file, content_type='text/json')
            os.remove(os.path.join(tempfile.gettempdir(), 'temp.json'))
            response['Content-Disposition'] = 'attachment; filename="region_estimated_data.json"'
    except Exception as err:
        response = HttpResponseServerError('Unable to open region estimated data file: ' + err)

    return response



def get_measurement_names():
    query_set = Actual_value.objects.distinct('measurement_name')
    result = []

    for idx, item in enumerate(query_set):
        result.append(item.measurement_name)

    return result


def actuals_at_timestamp(request, timestamp_idx, measurement):
    timestamps = get_timestamp_list()
    data = []
    measurement = measurement.strip()

    try:
        sensor_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        sensor_params = []

    try:
        timestamp_d = timestamps[timestamp_idx]
    except:
        return JsonResponse(data, safe=False)

    query_set = Actual_value.objects.filter(actual_data__timestamp=timestamp_d, measurement_name=measurement)

    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']

    for row in query_set.iterator():
        try:
            percentage_score = (row.value - min_val) / (max_val - min_val)
        except:
            percentage_score = None

        new_row = dict(row.join_sensor)

        new_row['ignore'] = False if select_sensor(new_row, sensor_params) else True

        new_row['percent_score'] = percentage_score
        data.append(new_row)

    return data


def select_sensor(sensor, params):
    # [{"name": {"omit_sensors": ["Inverness"]}}]
    # [{"name": {"select_sensors": ["Inverness"]}}]
    for item in params:
        item_key = next(iter(item))
        if item_key == 'name':
            sensor_field = sensor['name']
        else:
            sensor_field = sensor['extra_data'][item_key]

        dict_item = item[item_key]
        if dict_item and 'select_sensors' in dict_item and sensor_field not in dict_item['select_sensors']:
            return False
        if dict_item and 'omit_sensors' in dict_item and sensor_field in dict_item['omit_sensors']:
            return False

    return True

def filter_sensors(sensors, params):
    # [{"name": {"omit_sensors": ["Inverness"]}}]
    # [{"pc": {"select_sensors": ["kdljdflja"]}}]

    for item in params:
        item_key = next(iter(item))
        dict_selector = item[item_key]
        omit_or_select = next(iter(dict_selector))
        include = True if omit_or_select == 'select_sensors' else False
        values = item[item_key][omit_or_select]

        if item_key == 'name':
            if include:
                sensors = sensors.filter(name__in=values)
            else:
                sensors = sensors.exclude(name__in=values)
        else:
            for value in values:
                if include:
                    sensors = sensors.filter(extra_data__contains={item_key: value})
                else:
                    sensors = sensors.exclude(extra_data__contains={item_key: value})

    return sensors

def estimates_at_timestamp(request, method_name, timestamp_idx, measurement):
    data = []
    measurement = measurement.strip()
    timestamps = get_timestamp_list()

    try:
        sensor_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        sensor_params = []
    # print(json.dumps(sensor_params))


    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']

    try:
        timestamp_d = timestamps[timestamp_idx]
    except:
        return JsonResponse(data, safe=False)


    if method_name == 'file':
        query_set = Estimated_value.objects.filter(estimated_data__timestamp=timestamp_d, measurement_name=measurement)
        for row in query_set.iterator():
            try:
                percentage_score = (row.value - min_val) / (max_val - min_val)
            except:
                percentage_score = None

            new_row = dict(row.join_region)
            new_row['percent_score'] = percentage_score
            data.append(new_row)
    else:
        sensors = filter_sensors(Sensor.objects.all(), sensor_params)
        try:
            estimator = Region_estimator_factory.create_region_estimator(method_name, sensors)
        except Exception as err:
            print(err)
        else:
            result = estimator.get_all_region_estimations(timestamp_d, measurement)
            for row in result:
                #print('Row:', row['value'])
                if row['value'] and min_val and max_val:
                    percentage_score = (row['value'] - min_val) / (max_val - min_val)
                else:
                    percentage_score = None
                row['percent_score'] = percentage_score
                data.append(row)

    return data



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

    for idx, sensor in enumerate(Sensor.objects.all()):
        found = True
        x_average = x_average * (idx / (idx + 1)) + sensor.geom.coords[0] / (idx + 1)
        y_average = y_average * (idx / (idx + 1)) + sensor.geom.coords[1] / (idx + 1)

    if found:
        return json.dumps([str(y_average), str(x_average)])
    else:
        return ["54.2361", "-4.5481"]  # UK default


def handle_uploaded_files(request):

    try:
        filepath_sensor = request.FILES['sensor_data_file']
        filepath_actual = request.FILES['actual_data_file']
    except Exception as err:
        filepath_sensor, filepath_actual = False,False
        print(err)
    else:
        #  Saving POST'ed file to storage
        Actual_data.objects.all().delete()
        Sensor.objects.all().delete()

        file_sensors = TextIOWrapper(filepath_sensor.file, encoding=request.encoding)
        reader = csv.reader(file_sensors)
        field_titles = next(reader, None)  # skip the headers

        #titles: ['long', 'lat', 'name', 'Postcode3', 'Address']


        extra_field_idxs = []

        # Find the fields in the file
        for idx, title in enumerate(field_titles):
            title = title.strip().lower()
            if title == 'long':
                long_idx = idx
            elif title == 'lat':
                lat_idx = idx
            elif title == 'name':
                name_idx = idx
            else:
                extra_field_idxs.append(idx)

        for row in reader:
            try:
                extra_data = {}
                for idx in extra_field_idxs:
                    item = field_titles[idx]
                    extra_data[item] = row[idx]
                point_loc = Point(x=float(row[long_idx]),y=float(row[lat_idx]))
                sensor, created = Sensor.objects.get_or_create(
                    geom = point_loc,
                    name =  row[name_idx],
                    extra_data=extra_data)
                sensor.save()
            except Exception as err:
                print('Error loading sensor:', err)
                continue


        file_actual = TextIOWrapper(filepath_actual.file, encoding=request.encoding)
        reader = csv.reader(file_actual)
        field_titles = next(reader, None)  # skip the headers

        value_idxs = []
        timestamp_idx = None
        sensor_name_idx = None

        # Find the fields in the file
        for idx, title in enumerate(field_titles):
            title = title.strip().lower()
            if title.startswith('val_'):
                value_idxs.append(idx)
            elif title == 'time_stamp':
                timestamp_idx = idx
            elif title == 'sensor_name':
                sensor_name_idx = idx


        # Read in the data
        for row in reader:
            try:
                sensor_name = row[sensor_name_idx]

                try:
                    sensor = Sensor.objects.get(name=sensor_name)
                except Exception as err:
                    print('Sensor', sensor_name, 'not found for this actual datapoint:', err)
                else:
                    if sensor:
                        actual = Actual_data(   timestamp=row[timestamp_idx],
                                                sensor=sensor)
                        actual.save()

                        for idx in value_idxs:
                            try:
                                fvalue = float(row[idx])
                            except:
                                pass
                            else:
                                name = slugify(field_titles[idx].replace('val_','',1), to_lower=True, separator='_')
                                actual_value = Actual_value(    measurement_name=name,
                                                                value = fvalue,
                                                                actual_data = actual
                                )
                                actual_value.save()

            except Exception as err:
                print('Error loading actuals:', err)
                continue

        default_storage.save(filepath_sensor.name, filepath_sensor.file)
        default_storage.save(filepath_actual.name, filepath_actual.file)

    try:
        filepath_estimated = request.FILES['estimated_data_file']
        filepath_region = request.FILES['region_data_file']
    except Exception:
        filepath_estimated, filepath_region = False, False
    else:

        #Get all sensor measurement names (only accept estimations of values that we have sensors for)
        sensor_measurements = get_measurement_names()

        Estimated_data.objects.all().delete()
        Region.objects.all().delete()

        file_regions = TextIOWrapper(filepath_region.file, encoding=request.encoding)
        reader = csv.reader(file_regions)
        field_titles = next(reader, None)  # skip the headers
        #print('field titles:', field_titles)

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
                region.save()
            except Exception as err1:
                #print('Region file error. ', err1)
                #print('Region file error. Row: ', row[0])
                continue

        file_estimates = TextIOWrapper(filepath_estimated.file, encoding=request.encoding)
        reader = csv.reader(file_estimates)
        field_titles = next(reader, None)  # skip the headers
        #print('field titles:', field_titles)


        value_idxs = []
        extra_field_idxs = []
        timestamp_idx = 0
        region_idx = ''

        # Find the fields in the file
        for idx, title in enumerate(field_titles):
            title = title.strip().lower()
            if title.startswith('val_'):
                value_idxs.append(idx)
            elif title == 'time_stamp':
                timestamp_idx = idx
            elif title == 'region':
                region_idx = idx
            elif title.startswith('extra_'):
                extra_field_idxs.append(idx)

        extra_data_idxs = {}
        for extra_idx in extra_field_idxs:
            # 'extra_rings_Platanus_max'
            field_name = field_titles[extra_idx].replace('extra_', '', 1)
            # 'rings_Platanus_max'
            extra_data_field = field_name.split('_')[0]  # 'rings'
            measurement_name = slugify(field_name.replace(extra_data_field + '_', '', 1), to_lower=True, separator='_')
            # 'Platanus_max'
            if measurement_name not in extra_data_idxs:
                extra_data_idxs[measurement_name] = {}
            extra_data_idxs[measurement_name][extra_data_field] = extra_idx



        for row in reader:
            try:
                region = Region.objects.get(region_id=str(row[region_idx]))

                if region:
                    estimated = Estimated_data( timestamp=row[timestamp_idx],
                                                region=region
                                                )
                    estimated.save()


                    for idx in value_idxs:
                        name = slugify(field_titles[idx].replace('val_', '', 1), to_lower=True, separator='_')

                        # Get extra data fields
                        extra_idxs = extra_data_idxs[name]
                        extra_data = {}
                        for extra_data_name, extra_data_idx in extra_idxs.items():
                            extra_data[extra_data_name] = row[extra_data_idx]

                        # Check that the name has a matching sensor measurement
                        #  and add to model if it has.
                        if name in sensor_measurements:
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

        default_storage.save(filepath_region.name, filepath_region.file)
        default_storage.save(filepath_estimated.name, filepath_estimated.file)



