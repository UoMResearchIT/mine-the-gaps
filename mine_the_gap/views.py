from django.contrib.gis.geos import fromstr
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.datastructures import MultiValueDictKeyError
from django.views.generic import TemplateView
from io import TextIOWrapper
from django.contrib.gis.geos import Polygon

import csv

from .forms import FileUploadForm, SliderForm
from .models import Actual_data, Estimated_data, Region_data, Sensor


def home_page(request):
    if request.method == 'POST':
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            handle_uploaded_files(request)
            #return HttpResponseRedirect(request.path_info)
    else:
        form = FileUploadForm(files=request.FILES)
    return render(request, 'index.html', {'form': form, 'date_range_slider': SliderForm()})


def handle_uploaded_files(request):
    try:
        filepath = request.FILES['actual_data_file']
    except Exception:
        filepath = False
    else:
        Actual_data.objects.all().delete()
        file = TextIOWrapper(filepath.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                point_loc = Point(x=float(row[1]),y=float(row[2]))
                actual = Actual_data(   timestamp=row[0],
                                        geom = point_loc,
                                        value = float(row[3])
                                        )
                actual.save()
            except Exception as err:
                #print(err)
                continue

    try:
        filepath = request.FILES['sensor_data_file']
    except Exception:
        filepath = False
    else:
        Sensor.objects.all().delete()
        file = TextIOWrapper(filepath.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                point_loc = Point(x=float(row[0]),y=float(row[1]))
                sensor, created = Sensor.objects.get_or_create(
                    geom = point_loc,
                    metadata=row[2:])
                sensor.save()
            except Exception as err:
                #print(err)
                continue

    try:
        filepath = request.FILES['estimated_data_file']
    except MultiValueDictKeyError:
        filepath = False
    else:
        Estimated_data.objects.all().delete()
        file = TextIOWrapper(filepath.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                estimated = Estimated_data( timestamp=row[0],
                                            region_label = row[1],
                                            value = float(row[2]),
                                            metadata = str(row[3:])
                                            )
                estimated.save()
            except Exception as err:
                print(err)
                continue

    try:
        filepath = request.FILES['region_data_file']
    except MultiValueDictKeyError:
        filepath = False
    else:
        Region_data.objects.all().delete()
        file = TextIOWrapper(filepath.file, encoding=request.encoding)
        reader = csv.reader(file)
        next(reader, None)  # skip the headers
        for row in reader:
            try:
                poly = ()
                poly_split = row[1].split(' ')[1:]
                for point_str in poly_split:
                    point_split = point_str.strip().split(',')
                    point = (float(point_split[0]),float(point_split[1]))
                    poly = poly + (point,)
                # Make an enclosed circle if not already
                if poly[0] != poly[len(poly)-1]:
                    poly = poly + (poly[0])
                poly_geo =  Polygon(poly)

                #((0, 0), (0, 10), (10, 10), (0, 10), (0, 0)), ((4, 4), (4, 6), (6, 6), (6, 4), (4, 4))
                region = Region_data(   region_label = row[0],
                                        geom = poly_geo,
                                        metadata = str(row[2:])
                                        )
                region.save()
            except Exception as err1:
                print(err1)
                print(row[0])
                try:
                    poly = row[1]
                    region = Region_data(   region_label=row[0],
                                            polygon=poly,
                                            metadata = str(row[2:]))
                    region.save()
                except Exception as err2:
                    print(err2)
                    continue


