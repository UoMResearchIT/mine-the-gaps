from mine_the_gap.models import Actual_data, Actual_value, Region, Sensor
from django.db.models import Avg

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Diffusion_estimator(Region_estimator):

    def __init__(self, sensors=Sensor.objects.all()):
        super(Diffusion_estimator, self).__init__(sensors)

    class Factory:
        def create(self, sensors): return Diffusion_estimator(sensors)

    def get_all_region_estimations(self, timestamp, measurement):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'measurement': measurement, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], region_result['extra_data'] = self.get_diffusion_estimate(timestamp, measurement, region)
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


    def get_diffusion_estimate(self, timestamp, measurement, region):
        # Create a queryset with just the single input region
        regions = Region.objects.none()
        regions |= region

        # Create an empty queryset for storing completed regions
        regions_completed = Region.objects.none()

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive(Region.objects.filter(pk=region.pk), timestamp, measurement, 0, regions_completed)


    def get_diffusion_estimate_recursive(self, regions, timestamp, measurement, diffuse_level, regions_completed):
        # Create an empty queryset for sensors found in regions
        sensors = Sensor.objects.none()

        # Find sensors
        for region in regions.iterator():
            sensors |= self.sensors.filter(geom__within=region.geom)

        # Get the actual readings for those sensors
        actuals = Actual_value.objects.filter(actual_data__timestamp=timestamp,
                                              actual_data__sensor__in=sensors,
                                              measurement_name=measurement,
                                              value__isnull=False)
        if actuals.count() > 0:
            # If readings found for the sensors, take the average
            result = actuals.aggregate(Avg('value'))['value__avg']
            #print('Result (level ' + str(diffuse_level)  +'):', result)
            return result, {'rings': diffuse_level}
        else:
            # If no readings/sensors found, go up a diffusion level (adding completed regions to ignore list)
            regions_completed |= regions
            diffuse_level += 1

            # Find the next set of regions
            next_regions = self.get_adjacent_regions(regions, regions_completed)

            # If regions are found, continue, if not exit from the process
            if next_regions.count() > 0:
                return self.get_diffusion_estimate_recursive(next_regions, timestamp, measurement, diffuse_level, regions_completed)
            else:
                return None, {'rings': diffuse_level}