from mine_the_gap.models import Actual_value, Region, Sensor
from django.db.models import Avg

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Diffusion_estimator(Region_estimator):

    def __init__(self, sensors=Sensor.objects.all(), regions=Region.objects.all()):
        super(Diffusion_estimator, self).__init__(sensors, regions)

    class Factory:
        def create(self, sensors, regions): return Diffusion_estimator(sensors, regions)


    def get_estimate(self, timestamp, measurement, region):
        # Create a queryset with just the single input region
        #regions = Region.objects.none()
        #regions |= region

        # Create an empty queryset for storing completed regions
        regions_completed = type(self.regions.first()).objects.none()

        # Check there are sensors for this measurement and timestamp
        if Actual_value.objects.filter(actual_data__timestamp=timestamp, measurement_name=measurement).count() == 0:
            return None, {'rings': None}

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive(self.regions.filter(pk=region.pk), timestamp, measurement, 0, regions_completed)


    def get_diffusion_estimate_recursive(self, regions, timestamp, measurement, diffuse_level, regions_completed):
        # Create an empty queryset for sensors found in regions
        sensors = Sensor.objects.none()

        # Find sensors
        for region in regions.iterator():
            if not self.caching:
                sensors |= self.sensors.filter(geom__within=region.geom)
            elif region.region_id in self.region_cache and \
                'timestamp' in self.region_cache[region.region_id] and\
                'measurement' in self.region_cache[region.region_id]['timestamp'] and\
                'sensors' in self.region_cache[region.region_id]['timestamp']['measurement']:
                #print('region sensors found in region cache: ', region.region_id)
                sensors |= self.region_cache[region.region_id]['timestamp']['measurement']['sensors']
            else:
                cur_sensors = self.sensors.filter(geom__within=region.geom)
                #print('region sensors NOT found in region cache: ', region.region_id)
                sensors |= cur_sensors
                if region.region_id not in self.region_cache:
                    self.region_cache[region.region_id] = {'timestamp': {'measurement': {'sensors': cur_sensors}}}
                elif 'timestamp' not in self.region_cache[region.region_id]:
                    self.region_cache[region.region_id]['timestamp'] = {'measurement': {'sensors': cur_sensors}}
                elif 'measurement' not in self.region_cache[region.region_id]['timestamp']:
                    self.region_cache[region.region_id]['timestamp']['measurement'] = {'sensors': cur_sensors}
                elif 'sensors' not in self.region_cache[region.region_id]['timestamp']['measurement']:
                    self.region_cache[region.region_id]['timestamp']['measurement']['sensors'] = cur_sensors


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