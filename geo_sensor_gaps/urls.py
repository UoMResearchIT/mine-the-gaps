"""geo_sensor_gaps URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from mine_the_gap import views
from django.conf.urls import url, include
from django.conf import settings
from django.conf.urls.static import static

from djgeojson.views import GeoJSONLayerView

from mine_the_gap.models import Sensor, Region, Actual_data, Estimated_data


urlpatterns = [
    ##### Bespoke for web app #####
    path('admin/', admin.site.urls),
    url(r'^mine_the_gap/', include('mine_the_gap.urls')),
    path('sensor_fields', views.get_sensor_fields),
    path('all_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/', views.get_all_data_at_timestamp),


    #####  API type calls returning json #####

    ## Get region and sensor data ##

    # Get geoJson (only works on models with a geom field)
    url(r'^sensors.geojson$', GeoJSONLayerView.as_view(model=Sensor, properties=['popup_content']), name='sensors'),
    url(r'^regions.geojson$', GeoJSONLayerView.as_view(model=Region, properties=['popup_content']), name='regions'),

    # Get simple json
    path('sensors/', views.get_sensors),
    path('regions/', views.get_regions),

    ## Get actual and estimated data points ##

    # Get data for particular measurement, timestamp and region / sensor  (and estimation method for estimated_data)
    path('actual_data/<slug:measurement>/?P<slug:timestamp_val>/?P<int:sensor_id>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/<slug:region_id>/', views.get_estimates),

    # Get data for particular measurement and timestamp  (and estimation method for estimated_data)  - ALL REGIONS
    path('actual_data/<slug:measurement>/<slug:timestamp_val>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/', views.get_estimates),

    # Get data for particular measurement  (and estimation method for estimated_data)  -  ALL REGIONS AND TIMESTAMPS (slow)
    path('actual_data/<slug:measurement>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/', views.get_estimates),


    # File downloads
    path('sensors_file/<slug:file_type>/', views.get_sensors_file),
    path('regions_file/<slug:file_type>/', views.get_regions_file),
    path('sensor_data_file/<slug:file_type>/', views.get_actuals_file),
    path('region_estimates_file/<slug:file_type>/', views.get_estimates_file),

    path('', views.home_page),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

