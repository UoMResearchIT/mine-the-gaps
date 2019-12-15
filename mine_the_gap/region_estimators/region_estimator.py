from abc import ABCMeta, abstractmethod
import geopandas



class Region_estimator(object):
    __metaclass__ = ABCMeta

    def __init__(self, sensors, regions, actuals):
        self.sensors = sensors
        self.regions = regions
        self.actuals = actuals

        print('sensors:')
        print(self.sensors.head(3))
        print('regions:')
        print(self.regions.head(3))
        print('actuals:')
        print(self.actuals.head(3))

        self.__get_all_region_neighbours()
        self.__get_all_region_sensors()
        print('2')


    @abstractmethod
    def get_estimate(self, timestamp, region):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, region_id=None, timestamp=None):
        if region_id:
            region = self.regions.loc[self.regions['region_id'] == region_id]
            result = [self.get_region_estimation(region, timestamp)]
        else:
            result = []
            query_set = self.regions.order_by('region_id')
            for region in query_set.iterator():
                result.append(self.get_region_estimation(region, timestamp))

        return result


    def get_region_estimation(self, region, timestamp=None):
        region_result = {'region_id': region.region_id, 'estimates':[]}

        if timestamp:
            region_result_estimate = self.get_estimate(timestamp, region)
            region_result['estimates'].append({'value':region_result_estimate[0],
                                               'extra_data': region_result_estimate[1],
                                               'timestamp':timestamp})
        else:
            timestamps = sorted(self.actuals['timestamp'].unique())
            for index, timestamp in timestamps.items():
                region_result_estimate = self.get_estimate(timestamp, region)
                region_result['estimates'].append(  {'value':region_result_estimate[0],
                                                     'extra_data': region_result_estimate[1],
                                                     'timestamp': timestamp}
                                                    )
        return region_result


    def get_adjacent_regions(self, regions, ignore_regions):
        # Create an empty list for adjacent regions
        adjacent_regions =  []

        # Get all adjacent regions for each region
        for region in regions.itertuples(index=False, name='Region'):
            adjacent_regions.extend(region['neighbours'])

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return self.regions.loc[
            self.regions['region_id'] in adjacent_regions and self.regions['region_id'] not in ignore_regions
        ]


    def __get_all_region_neighbours(self):
        self.regions["NEIGHBORS"] = None  # add NEIGHBORS column
        for index, region in self.regions.iterrows():
            print(region.geometry)
            try:

                neighbors = self.regions[self.regions.geometry.touches(region.geometry)].region_id.tolist()
            except Exception as err:
                print('Error getting neighbours: ', str(err))
            print('1.1')
            neighbors = neighbors.remove(region['id'])
            self.regions.at[index, "neighbours"] = ", ".join(neighbors)
        print('1')

    def __get_all_region_sensors(self):
        print('1.5')
        for index, region in self.regions.iterrows():
            sensors = self.sensors[self.sensors.geometry.within(region['geometry'])].name.tolist()
            self.regions.at[index, "sensors"] = ", ".join(sensors)