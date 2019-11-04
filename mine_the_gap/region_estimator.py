from django.contrib.gis.geos import GEOSGeometry
from .models import Actual_data, Region, Sensor
from django.db.models import Avg
import json


class Region_estimator(object):

    def get_all_region_estimations(self, method_name, timestamp):
        result = []

        query_set = Region.objects.all()
        for region in query_set.iterator():
            region_result = {'timestamp': timestamp, 'region_id': region.region_id,
             'geom': region.geom.coords, 'region_extra_data': region.extra_data}

            region_result['value'], diffusion_level = self.get_region_estimation(method_name, timestamp, region)
            region_result['extra_data'] = [diffusion_level]
            result.append(region_result)

        return result


    def get_region_estimation(self, method_name, timestamp, region):
        result = {}

        if method_name == 'diffusion':
            result, extra_info = self.get_diffusion_estimate(timestamp, region)
        elif method_name == 'distance':
            result, extra_info = self.get_distance_estimate(timestamp, region)

        return result, extra_info


    def get_adjacent_regions(self, regions, regions_completed):
        select_regions = Region.objects.none()

        for region in regions.iterator():
            select_regions |= region.adjacent_regions
        result = Region.objects.filter(region_id__in= select_regions).exclude(region_id__in=regions_completed)

        return result


    def get_diffusion_estimate_recursive(self, regions, timestamp, diffuse_level, regions_completed):
        sensors = Sensor.objects.none()

        for region in regions.iterator():
            sensors |= Sensor.objects.filter(geom__within=region.geom)

        actuals = Actual_data.objects.filter(timestamp=timestamp, sensor__in=sensors)
        if actuals.count() > 0:
            result = actuals.aggregate(Avg('value'))['value__avg']
            print('Result (level ' + str(diffuse_level)  +'):', result)
            return result, diffuse_level
        else:
            regions_completed |= regions
            diffuse_level += 1

            next_regions = self.get_adjacent_regions(regions, regions_completed)

            if next_regions.count() > 0:
                return self.get_diffusion_estimate_recursive(next_regions, timestamp, diffuse_level, regions_completed)
            else:
                return None, diffuse_level



    def get_diffusion_estimate(self, timestamp, region):
        regions = Region.objects.none()
        regions_completed = Region.objects.none()
        regions |= region
        print('regions at start:', regions)
        result, diffuse_level = self.get_diffusion_estimate_recursive(Region.objects.filter(pk=region.pk), timestamp, 0, regions_completed)

        '''while result == None and diffuse_level < 10:
            sensors = Sensor.objects.none()
            regions = region.adjacent_regions
            #print('adjacent regions:', regions)

            for region in regions.iterator():
                sensors |= Sensor.objects.filter(geom__within=region.geom)
                actuals = Actual_data.objects.filter(timestamp=timestamp, sensor__in=sensors)
                avg = actuals.aggregate(Avg('value'))['value__avg']
                if avg:
                    result = avg
                    print('Result (level 1):', result)
            regions_completed.append(regions)

            diffuse_level += 1'''

        return result, diffuse_level


    def get_distance_estimate(self, timestamp, region_id):
        result = {}
        counter = 0

        while result == {}:
            counter += 1


        return result