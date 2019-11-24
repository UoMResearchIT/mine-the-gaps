from mine_the_gap.models import Actual_data, Actual_value, Region, Sensor
from django.contrib.gis.db.models.functions import Distance

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Distance_simple_estimator(Region_estimator):

    def __init__(self, sensors=Sensor.objects.all()):
        super(Distance_simple_estimator, self).__init__(sensors)

    class Factory:
        def create(self, sensors): return Distance_simple_estimator(sensors)

    def get_all_region_estimations(self, timestamp, measurement):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'measurement': measurement, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], region_result['extra_data'] = self.get_distance_estimate(timestamp, measurement, region)
            result.append(region_result)

        return result

    def get_region_estimation(self, timestamp, measurement, region_id):
        result = []

        region = Region.objects.get(region_id = region_id)

        region_result = {'timestamp': timestamp, 'measurement': measurement, 'region_id': region.region_id,
                         'geom': region.geom.coords, 'region_extra_data': region.extra_data}

        region_result['value'], region_result['extra_data'] = self.get_diffusion_estimate(timestamp, measurement,
                                                                                          region)
        result.append(region_result)

        return result



    def get_distance_estimate(self, timestamp, measurement, region):
        result = None, {'closest_sensor_data': None}

        # Get the closest sensor to the region
        actuals = Actual_value.objects.filter(
            actual_data__sensor__in=self.sensors,
            measurement_name=measurement,
            value__isnull=False)

        actual = actuals.filter(actual_data__timestamp=timestamp).annotate(
            distance=Distance('actual_data__sensor__geom', region.geom)).order_by('distance').first()

        # Get the value for that sensor on that timestamp
        if actual:
            # If readings found for the sensors, take the average
            result = actual.value, {'closest_sensor_id': str(actual.actual_data.sensor.name)}

        return result