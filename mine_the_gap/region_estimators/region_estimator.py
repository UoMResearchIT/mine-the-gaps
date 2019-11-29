from mine_the_gap.models import Region, Estimated_data
from abc import ABCMeta, abstractmethod


class Region_estimator(object):
    __metaclass__ = ABCMeta

    def __init__(self, sensors):
        self.sensors = sensors


    @abstractmethod
    def get_estimate(self, timestamp, measurement, region):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, measurement, region_id=None, timestamp=None):
        if region_id:
            region = Region.objects.get(region_id=region_id)
            result = [self.get_region_estimation(measurement, region, timestamp)]
        else:
            result = []
            query_set = Region.objects.all().order_by('region_id')
            for region in query_set.iterator():
                result.append(self.get_region_estimation(measurement, region, timestamp))

        return result


    def get_region_estimation(self, measurement, region, timestamp=None):
        region_result = {'region_id': region.region_id, 'estimates':[]}

        if timestamp:
            region_result['timestamp'] = timestamp
            region_result_estimate = self.get_estimate(timestamp, measurement, region)
            region_result['estimates'].append({'value':region_result_estimate[0], 'extra_data': region_result_estimate[1]})
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
        adjacent_regions = Region.objects.none()

        # Get all adjacent regions for each region
        for region in regions.iterator():
            adjacent_regions |= region.adjacent_regions

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return Region.objects.filter(region_id__in= adjacent_regions).exclude(region_id__in=ignore_regions)