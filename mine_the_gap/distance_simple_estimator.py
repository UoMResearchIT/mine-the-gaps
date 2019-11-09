from .models import Actual_data, Region, Sensor
from django.contrib.gis.db.models.functions import Distance

from mine_the_gap.region_estimator import Region_estimator


class Distance_simple_estimator(Region_estimator):

    class Factory:
        def create(self): return Distance_simple_estimator()

    def get_all_region_estimations(self, timestamp):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], region_result['extra_data'] = self.get_distance_estimate(timestamp, region)
            result.append(region_result)

        return result



    def get_distance_estimate(self, timestamp, region):
        result = None, {'closest_sensor_data': None}

        # Get the closest sensor to the region
        actual = Actual_data.objects.filter(timestamp=timestamp).annotate(
            distance=Distance('sensor__geom', region.geom)).order_by('distance').first()

        # Get the value for that sensor on that timestamp
        #print('Actuals:', str(actual))
        if actual:
            # If readings found for the sensors, take the average
            result = actual.value, {'closest_sensor_location': str(actual.sensor.name)}
        return result