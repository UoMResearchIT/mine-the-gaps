"""geo_site_gaps URL Configuration

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
from django.urls import path, re_path
from mine_the_gap import views
from django.conf.urls import include
from django.conf import settings
from django.conf.urls.static import static

from djgeojson.views import GeoJSONLayerView

from mine_the_gap.models import Sensor, Region


urlpatterns = [
    ##### Bespoke for web app #####
    path('', views.home_page),
    path('admin/', admin.site.urls),
    path('initialise/', views.initialise),
    path('progress/', views.get_progress),
    path('site_fields', views.get_site_fields),
    path('all_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/', views.get_all_data_at_timestamp),
    path('all_regions/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/', views.get_all_regions_at_timestamp),
    path('all_sites/<slug:measurement>/<slug:timestamp_val>/', views.get_all_sites_at_timestamp),
    path('all_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/<int:site_id>/', views.get_all_timeseries_at_region),

    #####  API type calls returning json #####

    ## Get region and site data ##

    # Get geoJson (only works on models with a geom field)
    re_path(r'^sites_metadata.geojson$', GeoJSONLayerView.as_view(model=Sensor, properties=['popup_content']), name='sites_metadata'),
    re_path(r'^regions_metadata.geojson$', GeoJSONLayerView.as_view(model=Region, properties=['popup_content']), name='regions_metadata'),

    ## Get actual and estimated data points ##

    # Get data for particular measurement, timestamp and region / site  (and estimation method for estimated_data)
    re_path('site_data/<slug:measurement>/<slug:timestamp_val>/<int:site_id>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/<slug:region_id>/', views.get_estimates),

    # Get data for particular measurement and timestamp  (and estimation method for estimated_data)  - ALL REGIONS/SITES
    path('site_data/<slug:measurement>/<slug:timestamp_val>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/<slug:timestamp_val>/', views.get_estimates),

    # Get data for particular measurement  (and estimation method for estimated_data)  -  ALL REGIONS AND TIMESTAMPS (slow)
    # Commented out as too slow!
    path('site_data/<slug:measurement>/', views.get_actuals),
    path('estimated_data/<slug:method_name>/<slug:measurement>/', views.get_estimates),

    ##### Timeseries #####

    # Get data for particular measurement and region  (and estimation method for estimated_data)  - ALL REGIONS
    path('site_timeseries/<slug:measurement>/<int:site_id>/', views.get_actuals_timeseries),
    path('estimated_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/', views.get_estimates_timeseries),
    path('estimated_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/<int:ignore_site_id>/', views.get_estimates_timeseries),


    ##### File downloads #####

    re_path(r'sites_metadata_file/(?P<file_type>csv|json)/', views.get_sites_file),
    re_path(r'regions_metadata_file/(?P<file_type>csv|json)/', views.get_regions_file),
    re_path(r'sites_data_file/(?P<file_type>csv|json)/', views.get_actuals_file),
    re_path(r'regions_estimates_file/(?P<file_type>csv|json)/', views.get_estimates_file),


    #####  As file downloads above, but allow pure json (API) calls #####

    re_path(r'sites_metadata_file/', views.get_sites_file),
    re_path(r'regions_metadata_file/', views.get_regions_file),
    re_path(r'sites_data_file/', views.get_actuals_file),
    re_path(r'regions_estimates_file/', views.get_estimates_file),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

urlpatterns += [
    path('accounts/', include('django.contrib.auth.urls')),
]

