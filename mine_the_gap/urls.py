from django.conf.urls import url
from . import views
from djgeojson.views import GeoJSONLayerView
from .models import Shop


app_name = 'mine_the_gap'

urlpatterns = [
    # location detail view
    url(r'^(-?\d+\.\d+),(-?\d+\.\d+)$',  #https://stackoverflow.com/questions/5628786/python-urls-py-regex-help-with-coordinates
        views.LocationDetailView.as_view(), name='location-detail'),
	url(r'^upload_csv/$', views.upload_csv),
    #url(r'^data.geojson$', GeoJSONLayerView.as_view(model=Shop, properties=('title', 'description', 'picture_url')), name='data'),
]