from django.contrib.gis.geos import fromstr
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.datastructures import MultiValueDictKeyError
from django.views.generic import TemplateView
from io import TextIOWrapper
from django.contrib.gis.geos import MultiPolygon, Polygon, Point
from django.http import JsonResponse

import csv
import json
import datetime

from .forms import FileUploadForm
from .models import Actual_data, Estimated_data, Region, Sensor


def home_page(request):
    if request.method == 'POST':
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            handle_uploaded_files(request)
            #return HttpResponseRedirect(request.path_info)
    else:
        form = FileUploadForm(files=request.FILES)

    timestamp_range = get_timestamp_list()

    return render(request, 'index.html', {'form': form, 'timestamp_range': timestamp_range})


def get_actuals_at_timestamp(request, timestamp_idx):
    timestamps = get_timestamp_list()

    try:
        timestamp_d = timestamps[timestamp_idx]
    except:
        return None

    query_set = Actual_data.objects.filter(timestamp=timestamp_d)

    data = []

    for row in query_set.iterator():
        data.append(row.join_sensor)

    return JsonResponse(data, safe=False)



def get_estimates_at_timestamp(request, timestamp_idx):
    timestamps = get_timestamp_list()

    try:
        timestamp_d = timestamps[timestamp_idx]
    except:
        return None

    query_set = Estimated_data.objects.filter(timestamp=timestamp_d)

    data = []

    for row in query_set.iterator():
        data.append(row.join_region)

    return JsonResponse(data, safe=False)



def get_timestamp_list():
    query_set = Estimated_data.objects.order_by('timestamp').values('timestamp').distinct()
    result = []

    for idx, item in enumerate(query_set):
        # e.g.: {'timestamp': datetime.date(2017, 1, 1)}
        result.append(item['timestamp'])

    return result

def handle_uploaded_files(request):

    try:
        filepath_sensor = request.FILES['sensor_data_file']
        filepath_actual = request.FILES['actual_data_file']
    except Exception:
        filepath_sensor, filepath_actual = False,False
    else:
        Sensor.objects.all().delete()
        Actual_data.objects.all().delete()


        file = TextIOWrapper(filepath_sensor.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                point_loc = Point(x=float(row[0]),y=float(row[1]))
                sensor, created = Sensor.objects.get_or_create(
                    geom = point_loc,
                    extra_data=row[2:])
                sensor.save()
            except Exception as err:
                continue


        file = TextIOWrapper(filepath_actual.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                point_loc = Point(x=float(row[1]),y=float(row[2]))

                actual = Actual_data(   timestamp=row[0],
                                        sensor = Sensor.objects.get(geom=point_loc),
                                        value = float(row[3])
                                        )
                actual.save()
            except Exception as err:
                #print(err)
                continue



    try:
        filepath_estimated = request.FILES['estimated_data_file']
        filepath_region = request.FILES['region_data_file']
    except Exception:
        filepath_estimated, filepath_region = False, False
    else:
        Estimated_data.objects.all().delete()
        Region.objects.all().delete()

        file = TextIOWrapper(filepath_region.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
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
                                extra_data=str(row[2:])
                                )
                region.save()
            except Exception as err1:
                print('Region file error. ', err1)
                print('Region file error. Row: ', row[0])
                continue

        file = TextIOWrapper(filepath_estimated.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:

                estimated = Estimated_data( timestamp=row[0],
                                            region=Region.objects.get(region_id=str(row[1])),
                                            value = float(row[2]),
                                            extra_data = str(row[3:])
                                            )
                estimated.save()
            except Exception as err:
                print(row)
                print('Estimate file error: ', err, 'Region_ID:' + str(row[1]))
                continue





