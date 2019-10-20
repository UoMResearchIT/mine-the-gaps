from django.views import generic
from django.contrib.gis.geos import fromstr
from django.contrib.gis.db.models.functions import Distance
from .models import Shop
from django.contrib.gis.geos import Point

from django.views.generic import TemplateView, DetailView

longitude = -2.242631
latitude = 53.480759

user_location = Point(longitude, latitude, srid=4326)


class Home(generic.ListView):
    model = Shop
    context_object_name = 'shops'
    queryset = Shop.objects.annotate(distance=Distance('location', user_location)).order_by('distance')[0:6]
    template_name = 'index.html'



class LocationDetailView(TemplateView):
    """
        Location template view.
    """
    template_name = 'location-detail.html'


