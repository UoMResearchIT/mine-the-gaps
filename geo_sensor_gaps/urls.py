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

from mine_the_gap.models import Sensor, Region_data, Actual_data, Estimated_data


urlpatterns = [
    path('admin/', admin.site.urls),
    url(r'^mine_the_gap/', include('mine_the_gap.urls')),
    url(r'^sensor_data.geojson$', GeoJSONLayerView.as_view(model=Sensor, properties=['popupContent']), name='sensor_data'),
    url(r'^region_data.geojson$', GeoJSONLayerView.as_view(model=Region_data, properties=['popupContent']), name='region_data'),
    url(r'^actual_data.geojson/<int:timestamp>/$', GeoJSONLayerView.as_view(model=Actual_data), name='actual_data'),

    path('', views.home_page),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

