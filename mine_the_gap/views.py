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
from h3 import h3
from geojson import Feature, FeatureCollection



from mine_the_gap.forms import FileUploadForm
from mine_the_gap.models import Actual_data, Actual_value, Estimated_data, Region, Sensor, Filenames, Estimated_value, \
    Region_dynamic
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

            try:
                if form.cleaned_data.get("sensor_metadata_file"):
                    filenames.sensor_metadata_filename = form.cleaned_data.get("sensor_metadata_file")
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

    context = { 'form': None, #FileUploadForm(),
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


def get_actuals(request, measurement, timestamp_val=None, sensor_id=None):
    data = actuals(request, measurement, timestamp_val=timestamp_val, sensor_id=sensor_id, return_all_fields=False)
    return JsonResponse(data, safe=False)

def get_estimates(request, method_name, measurement, region_type='file', timestamp_val=None, region_id=None):
    data = estimates(
        request,
        method_name,
        measurement,
        region_type=region_type,
        timestamp_val=timestamp_val,
        region_id=region_id,
        return_all_fields=False)
    return JsonResponse(data, safe=False)

def get_actuals_timeseries(request, measurement, sensor_id=None):
    data = actuals(request, measurement, timestamp_val=None, sensor_id=sensor_id, return_all_fields=False)
    return JsonResponse(data, safe=False)

def get_estimates_timeseries(request, method_name, measurement, region_type='file', region_id=None, ignore_sensor_id=None):
    data = estimates(
        request,
        method_name,
        measurement,
        region_type=region_type,
        timestamp_val=None,
        region_id=region_id,
        return_all_fields=False,
        ignore_sensor_id=ignore_sensor_id)
    return JsonResponse(data, safe=False)


def get_sensors_file(request, file_type=None):
    # Create the HttpResponse object with the appropriate CSV header.
    if file_type == 'csv':
        response = get_csv_response(Filenames.objects.first().sensor_metadata_filename, 'sensors_metadata.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().sensor_metadata_filename),
                                     'sensors_metadata.json',
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
        response = get_csv_response(Filenames.objects.first().actual_data_filename, 'sensors_data.csv')
    else:
        response = get_json_response(os.path.join(settings.MEDIA_ROOT, Filenames.objects.first().actual_data_filename),
                                     'sensors_data.json',
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






def actuals(request, measurement, timestamp_val=None, sensor_id=None, return_all_fields=True):
    data = []
    measurement = measurement.strip()

    try:
        sensor_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        sensor_params = []

    if timestamp_val and sensor_id:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__timestamp=str(timestamp_val),
                                                actual_data__sensor_id=sensor_id)
    elif timestamp_val:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__timestamp=str(timestamp_val))\
            .order_by('actual_data__sensor_id')
    elif sensor_id:
        query_set = Actual_value.objects.filter(measurement_name=measurement,
                                                actual_data__sensor_id=sensor_id)\
            .order_by('actual_data__timestamp')
    else:
        query_set = Actual_value.objects.filter(measurement_name=measurement) \
            .order_by('actual_data__sensor_id', 'actual_data__timestamp')

    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']

    for row in query_set.iterator():
        percentage_score = calcuate_percentage_score(row.value, min_val, max_val)
        new_row = dict(row.join_sensor) if return_all_fields else dict(row.join_sensor_lite)
        new_row['ignore'] = False if select_sensor(new_row, sensor_params) else True
        new_row['percent_score'] = percentage_score
        data.append(new_row)

    return data

def calcuate_percentage_score(value, min, max):
    try:
        return round((value - min) / (max - min),2)
    except:
        return None


def estimates(request, method_name, measurement, region_type='file', timestamp_val=None,  region_id=None, return_all_fields=False,
              ignore_sensor_id=None):
    data = []
    measurement = measurement.strip()

    try:
        sensor_params = json.loads(request.body.decode("utf-8"))['selectors']
    except:
        sensor_params = []
    # print(json.dumps(sensor_params))

    min_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Min('value'))['value__min']
    max_val = Actual_value.objects.filter(measurement_name=measurement).aggregate(Max('value'))['value__max']

    if method_name == 'file':
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
            try:
                percentage_score = calcuate_percentage_score(row.value, min_val, max_val)
            except:
                percentage_score = None

            new_row = dict(row.join_region) if return_all_fields else dict(row.join_region_lite)
            new_row['percent_score'] = percentage_score
            new_row['method_name'] = method_name
            data.append(new_row)
    else:
        sensors = filter_sensors(Sensor.objects.exclude(id=ignore_sensor_id), sensor_params)
        regions = Region.objects.all() if region_type=='file' else Region_dynamic.objects.all()

        try:
            estimator = Region_estimator_factory.create_region_estimator(method_name, sensors, regions)
        except Exception as err:
            print(err)
        else:
            result = estimator.get_estimations(measurement, region_id, timestamp_val)

            for row in result:
                #print('Row:', str(row))
                for estimate_result in row['estimates']:
                    percentage_score = calcuate_percentage_score(estimate_result['value'], min_val, max_val)
                    data.append(    {'region_id': row['region_id'],
                                     'timestamp':estimate_result['timestamp'],
                                     'value': estimate_result['value'],
                                     'percent_score': percentage_score,
                                     'method_name': method_name,
                                     'extra_data': estimate_result['extra_data']})

    return data


def select_sensor(sensor, params):
    # [{"name": {"omit_sensors": ["Inverness"]}}]
    # [{"name": {"select_sensors": ["Inverness"]}}]
    for item in params:
        item_key = next(iter(item))
        if item_key == 'name':
            sensor_field = sensor['name']
        else:
            sensor_field = sensor['sensor_extra_data'][item_key]

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




def get_measurement_names():
    query_set = Actual_value.objects.distinct('measurement_name')
    result = []

    for idx, item in enumerate(query_set):
        result.append(item.measurement_name)

    return result


def get_hexagons(request, northwest_lat='60.861632', northwest_lng='-13.065419', southeast_lat='49.916746', southeast_lng='4.863539'):
    try:
        poly = [[[float(northwest_lng), float(northwest_lat)],
                       [float(northwest_lng), float(southeast_lat)],
                       [float(southeast_lng), float(southeast_lat)],
                       [float(southeast_lng), float(northwest_lat)],
                       [float(northwest_lng), float(northwest_lat)]]]
    except ValueError as err:
        return HttpResponseServerError('Unable to convert parameters to co-ordinates:' + str(err))

    geo = {'type':'Polygon','coordinates': poly}

    #set_hexagons = h3.polyfill(geo_json=row_sel["geometry"], res=9, geo_json_conformant=True)
    hexagons = list(h3.polyfill(geo_json=geo, res=4))

    #hexagons_rev = reverse_lat_lon(hexagons)

    df_fill_hex = pd.DataFrame({"hex_id": hexagons})
    df_fill_hex["value"] = 0
    df_fill_hex['geometry'] = df_fill_hex.hex_id.apply(lambda x:
                                                       {"type": "Polygon",
                                                        "coordinates":
                                                            [h3.h3_to_geo_boundary(h3_address=x, geo_json=False)]
                                                        }
                                                       )

    Region_dynamic.objects.all().delete()

    for i, row in df_fill_hex.iterrows():
        #print(row['geometry']['coordinates'][0])
        multipoly_geo = MultiPolygon()
        poly = ()
        for coord in row['geometry']['coordinates'][0]:
            point = (coord[0], coord[1])
            poly = poly + (point,)
        poly = poly + ((row['geometry']['coordinates'][0][0][0], row['geometry']['coordinates'][0][0][1] ),)
        poly_geo = Polygon(poly)
        multipoly_geo.append(poly_geo)

        region = Region_dynamic(region_id=i,
                        geom=multipoly_geo,
                        extra_data={'method': 'auto generated hexagons'}
                        )
        region.save()


    geojson_hx = hexagons_dataframe_to_geojson(df_fill_hex)

    return JsonResponse(geojson_hx, safe=False)


def hexagons_dataframe_to_geojson(df_hex):
    '''Produce the GeoJSON for a dataframe that has a geometry column in geojson format already, along with the columns hex_id and value '''

    list_features = []

    for i, row in df_hex.iterrows():
        properties = {"popup_content": {
            'region_id':i,
            'extra_data':{'method': 'auto generated hexagons'}
        }}
        feature = Feature(geometry=row["geometry"], id=i, properties=properties)
        list_features.append(feature)

    feat_collection = FeatureCollection(list_features)

    return feat_collection


def get_all_data_at_timestamp(request, method_name, measurement=None, timestamp_val=None, region_type='file'):
    data = {
                'actual_data': actuals(request, measurement, timestamp_val=timestamp_val, return_all_fields=True),
                'estimated_data': estimates(request, method_name, measurement, region_type=region_type, timestamp_val=timestamp_val, return_all_fields=True)
    }
    return JsonResponse(data, safe=False)


def get_all_timeseries_at_region(request, method_name, measurement, region_id, sensor_id, region_type='file'):
    data = {
        'actual_data': actuals(request, measurement, sensor_id=sensor_id, return_all_fields=True),
        'estimated_data': estimates(request, method_name, measurement, region_type=region_type, region_id=region_id, return_all_fields=True)
    }
    return JsonResponse(data, safe=False)



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
        filepath_sensor = request.FILES['sensor_metadata_file']
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
        sensor_name_idx = None
        lat_idx = None
        long_idx = None

        #print(str(field_titles))

        # Find the fields in the file
        for idx, title in enumerate(field_titles):
            title = title.strip().lower()
            if title == 'long':
                long_idx = idx
            elif title == 'lat':
                lat_idx = idx
            elif title == 'sensor_name':
                sensor_name_idx = idx
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
                    name =  row[sensor_name_idx],
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
                    print('Sensor', sensor_name, 'not returned for this actual datapoint, due to:', err)
                else:
                    if sensor:
                        actual = Actual_data(   timestamp=slugify(row[timestamp_idx]),
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
        filepath_region = request.FILES['region_metadata_file']
    except Exception:
        filepath_estimated, filepath_region = False, False
    else:

        #Get all sensor measurement names (only accept estimations of values that we have sensors for)
        #sensor_measurements = get_measurement_names()

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
                    estimated = Estimated_data( timestamp=slugify(row[timestamp_idx]),
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
                        #if name in sensor_measurements:
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



