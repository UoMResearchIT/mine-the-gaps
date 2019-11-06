from django.contrib.gis.geos import GEOSGeometry
from .models import Actual_data, Region, Sensor
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Avg
import json


class Region_estimator(object):

    def get_all_region_estimations(self, method_name, timestamp):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], region_result['extra_data'] = self.get_region_estimation(method_name, timestamp, region)
            result.append(region_result)

        return result


    def get_region_estimation(self, method_name, timestamp, region):
        if method_name == 'diffusion':
            result, extra_info = self.get_diffusion_estimate(timestamp, region)
        elif method_name == 'distance':
            result, extra_info = self.get_distance_estimate(timestamp, region)

        return result, extra_info


    def get_adjacent_regions(self, regions, regions_completed):
        # Create an empty queryset for adjacent regions
        adjacent_regions = Region.objects.none()

        # Get all adjacent regions for each region
        for region in regions.iterator():
            adjacent_regions |= region.adjacent_regions

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return Region.objects.filter(region_id__in= adjacent_regions).exclude(region_id__in=regions_completed)


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



    def get_diffusion_estimate(self, timestamp, region):
        # Create a queryset with just the single input region
        regions = Region.objects.none()
        regions |= region

        # Create an empty queryset for storing completed regions
        regions_completed = Region.objects.none()

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive(Region.objects.filter(pk=region.pk), timestamp, 0, regions_completed)



    def get_distance_estimate(self, timestamp, region):
        result = None, {'closest_sensor_data': None}

        # Get the closest sensor to the region
        actual = Actual_data.objects.filter(timestamp=timestamp).annotate(distance=Distance('sensor__geom', region.geom)).order_by('distance').first()

        # Get the value for that sensor on that timestamp
        #print('Actuals:', str(actual))
        if actual:
            # If readings found for the sensors, take the average
            result = actual.value, {'closest_sensor_data': actual.sensor.extra_data}
        return result