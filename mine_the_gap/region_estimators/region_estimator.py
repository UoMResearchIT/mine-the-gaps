from mine_the_gap.models import Region, Estimated_data
from abc import ABCMeta, abstractmethod


class Region_estimator(object):
    __metaclass__ = ABCMeta

    def __init__(self, sensors):
        self.sensors = sensors

    @abstractmethod
    def get_estimations(self, measurement, region_id=None, timestamp=None):
        pass

    @abstractmethod
    def get_region_estimation(self, measurement, region, timestamp=None):
        pass

    @abstractmethod
    def get_estimate(self, timestamp, measurement, region):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, measurement, region_id=None, timestamp=None):
        if region_id:
            region = Region.objects.get(region_id=region_id)
            result = [self.get_region_estimation(measurement, region, timestamp)]
        else:
            result = []
            query_set = Region.objects.all()
            for region in query_set.iterator():
                result.append(self.get_region_estimation(measurement, region, timestamp))

        return result


    def get_region_estimation(self, measurement, region, timestamp=None):
        if timestamp:
            region_result = {   'timestamp': timestamp,
                                'measurement': measurement,
                                'region_id': region.region_id}
            region_result['value'], region_result['extra_data'] = self.get_estimate(timestamp, measurement, region)

        else:
            region_result = []
            timestamps = Estimated_data.objects.distinct(timestamp)
            for timestamp in timestamps.iterator():
                region_timestamp_result = {'timestamp': timestamp,
                                 'measurement': measurement,
                                 'region_id': region.region_id}
                region_timestamp_result['value'], region_result['extra_data'] = self.get_estimate(timestamp, measurement, region)
                region_result.append(region_timestamp_result)

        return region_result


    def get_adjacent_regions(self, regions, ignore_regions):
        # Create an empty queryset for adjacent regions
        adjacent_regions = Region.objects.none()

        # Get all adjacent regions for each region
        for region in regions.iterator():
            adjacent_regions |= region.adjacent_regions

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return Region.objects.filter(region_id__in= adjacent_regions).exclude(region_id__in=ignore_regions)