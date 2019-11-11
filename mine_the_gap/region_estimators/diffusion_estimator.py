from mine_the_gap.models import Actual_data, Region, Sensor
from django.db.models import Avg

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Diffusion_estimator(Region_estimator):

    class Factory:
        def create(self): return Diffusion_estimator()

    def get_all_region_estimations(self, timestamp):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], region_result['extra_data'] = self.get_diffusion_estimate(timestamp, region)
            result.append(region_result)

        return result


    def get_diffusion_estimate(self, timestamp, region):
        # Create a queryset with just the single input region
        regions = Region.objects.none()
        regions |= region

        # Create an empty queryset for storing completed regions
        regions_completed = Region.objects.none()

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive(Region.objects.filter(pk=region.pk), timestamp, 0, regions_completed)


    def get_diffusion_estimate_recursive(self, regions, timestamp, diffuse_level, regions_completed):
        # Create an empty queryset for sensors found in regions
        sensors = Sensor.objects.none()

        # Find sensors
        for region in regions.iterator():
            sensors |= Sensor.objects.filter(geom__within=region.geom)

        # Get the actual readings for those sensors
        actuals = Actual_data.objects.filter(timestamp=timestamp, sensor__in=sensors)
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
                return self.get_diffusion_estimate_recursive(next_regions, timestamp, diffuse_level, regions_completed)
            else:
                return None, {'rings': diffuse_level}