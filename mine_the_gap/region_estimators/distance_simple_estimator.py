from mine_the_gap.models import Actual_value, Region, Sensor, Estimated_data
from django.contrib.gis.db.models.functions import Distance

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Distance_simple_estimator(Region_estimator):

    def __init__(self, sensors=Sensor.objects.all()):
        super(Distance_simple_estimator, self).__init__(sensors)

    class Factory:
        def create(self, sensors): return Distance_simple_estimator(sensors)



    def get_estimate(self, timestamp, measurement, region):
        result = None, {'closest_sensor_data': None}

        # Get the closest sensor to the region
        actuals = Actual_value.objects.filter(
            actual_data__sensor__in=self.sensors,
            measurement_name=measurement,
            value__isnull=False)

        actuals_filtered = actuals.filter(actual_data__timestamp=timestamp)

        if actuals_filtered.count() > 0:
            actual = actuals_filtered.annotate(
                distance=Distance('actual_data__sensor__geom', region.geom)).order_by('distance').first()

            # Get the value for that sensor on that timestamp
            if actual:
                # If readings found for the sensors, take the average
                result = actual.value, {'closest_sensor_id': str(actual.actual_data.sensor.name)}

        return result