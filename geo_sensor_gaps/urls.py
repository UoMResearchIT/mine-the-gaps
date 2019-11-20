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
    path('admin/', admin.site.urls),
    url(r'^mine_the_gap/', include('mine_the_gap.urls')),
    url(r'^sensor.geojson$', GeoJSONLayerView.as_view(model=Sensor, properties=['popupContent']), name='sensor'),
    #url(r'^actual_data.geojson$', GeoJSONLayerView.as_view(model=Actual_data, properties=['popupContent']), name='actual_data'),
    url(r'^region.geojson$', GeoJSONLayerView.as_view(model=Region, properties=['popupContent']), name='region'),
    #url(r'^estimated_data.geojson$', GeoJSONLayerView.as_view(model=Estimated_data, properties=['popupContent']), name='estimated_data'),
    path('actual_data/<int:timestamp_idx>/<slug:measurement>/', views.get_actuals_at_timestamp),
    path('estimated_data/<slug:method_name>/<int:timestamp_idx>/<slug:measurement>/', views.get_estimates_at_timestamp),
    path('all_data/<slug:method_name>/<int:timestamp_idx>/<slug:measurement>/', views.get_all_data_at_timestamp),
    path('sensor_fields', views.get_sensor_fields),

    path('', views.home_page),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

