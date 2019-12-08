from mine_the_gap.models import Estimated_data, Region
from abc import ABCMeta, abstractmethod
import datetime


class Region_estimator(object):
    __metaclass__ = ABCMeta

    def __init__(self, sensors, regions):
        self.sensors = sensors
        self.regions = regions
        self.region_cache = {}
        self.actuals_cache = {}
        self.caching = True


    @abstractmethod
    def get_estimate(self, timestamp, measurement, region):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, measurement, region_id=None, timestamp=None, caching=True):
        self.caching = caching
        start_time = datetime.datetime.now()
        if region_id:
            region = self.regions.get(region_id=region_id)
            result = [self.get_region_estimation(measurement, region, timestamp)]
        else:
            result = []
            query_set = self.regions.order_by('region_id')
            for region in query_set.iterator():
                result.append(self.get_region_estimation(measurement, region, timestamp))

        print('Time taken:', datetime.datetime.now() - start_time, 'Caching:', self.caching,
              'Timestamp:', str(timestamp), 'Measurement:', measurement)
        return result


    def get_region_estimation(self, measurement, region, timestamp=None):
        region_result = {'region_id': region.region_id, 'estimates':[]}

        if timestamp:
            region_result_estimate = self.get_estimate(timestamp, measurement, region)
            region_result['estimates'].append({'value':region_result_estimate[0],
                                               'extra_data': region_result_estimate[1],
                                               'timestamp':timestamp})
        else:
            timestamps = Estimated_data.objects.distinct('timestamp').order_by('timestamp')
            for timestamp in timestamps.iterator():
                region_result_estimate = self.get_estimate(timestamp.timestamp, measurement, region)
                region_result['estimates'].append(  {'value':region_result_estimate[0],
                                                     'extra_data': region_result_estimate[1],
                                                     'timestamp': timestamp.timestamp}
                                                    )
        return region_result


    def get_adjacent_regions(self, regions, ignore_regions):
        # Create an empty queryset for adjacent regions
        if len(self.regions) > 0:
            adjacent_regions =  type(self.regions.first()).objects.none()

        # Get all adjacent regions for each region
        for region in regions.iterator():
            if not self.caching:
                adjacent_regions |= region.adjacent_regions
            elif region.region_id in self.region_cache and 'adjacent_regions' in self.region_cache[region.region_id]:
                #print('adjacent regions found in region cache: ', region.region_id)
                adjacent_regions |= self.region_cache[region.region_id]['adjacent_regions']
            else:
                #print('adjacent regions NOT found in region cache: ', region.region_id)
                adj_regs = region.adjacent_regions
                adjacent_regions |= adj_regs
                if region.region_id not in self.region_cache:
                    self.region_cache[region.region_id] = {'adjacent_regions': adj_regs}
                else:
                    self.region_cache[region.region_id]['adjacent_regions'] = adj_regs

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return self.regions.filter(region_id__in = adjacent_regions).exclude(region_id__in=ignore_regions)