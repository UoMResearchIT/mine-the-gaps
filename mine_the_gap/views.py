import logging
#from django.core.checks import messages
from django.contrib import messages
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.urls import reverse
from django.views import generic
from django.contrib.gis.geos import fromstr
from django.contrib.gis.db.models.functions import Distance  # Keep this, you will need it soon
from django.contrib.gis.geos import Point
from django import forms
from django.views.generic import TemplateView
import json
from django.http import JsonResponse

from .forms import FileUploadForm


class Home(TemplateView):

    # Keep this you will need it soon (even though no longer used in template.
    #model = Shop
    #context_object_name = 'shops'
    #queryset = Shop.objects.annotate(distance=Distance('location', user_location)).order_by('distance')[0:6]

    form = FileUploadForm()
    template_name = 'index.html'


def upload_csv(request):
    if request.method == 'POST':
        file_name = request.POST.get('file_name')
        response_data = {}

        response_data['result'] = 'upload CSV successful!'
        response_data['filename'] = file_name


        return JsonResponse(response_data)
    else:
        return JsonResponse({})




class LocationDetailView(TemplateView):
    """
        Location template view.
    """
    template_name = 'location_detail.html'



