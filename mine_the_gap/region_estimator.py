from django.contrib.gis.geos import GEOSGeometry
from .models import Actual_data, Region, Sensor


class Region_estimator(object):

    def get_all_region_estimations(self, method_name, timestamp):
        return []


    def get_region_estimation(self, method_name, timestamp):
        return []