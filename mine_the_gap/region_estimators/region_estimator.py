from abc import ABCMeta, abstractmethod


class Region_estimator(object):
    __metaclass__ = ABCMeta

    def __init__(self, sensors, regions, actuals):
        self.sensors = sensors
        self.regions = regions
        self.actuals = actuals

        self.__get_all_region_neighbours()
        self.__get_all_region_sensors()
        #self.actuals.to_csv('/home/mcassag/Documents/PROJECTS/Turing_Breathing/Manuele/Mine_the_gap_inputs/temp/actuals.csv')


    @abstractmethod
    def get_estimate(self, timestamp, region):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, region_id=None, timestamp=None):
        if region_id:
            #region = self.regions.loc[self.regions.index == region_id]
            result = [self.get_region_estimation(region_id, timestamp)]
        else:
            result = []
            for index, region in self.regions.iterrows():
                result.append(self.get_region_estimation(index, timestamp))

        return result


    def get_region_estimation(self, region_id, timestamp=None):
        region_result = {'region_id': region_id, 'estimates':[]}

        if timestamp:
            region_result_estimate = self.get_estimate(timestamp, region_id)
            region_result['estimates'].append({'value':region_result_estimate[0],
                                               'extra_data': region_result_estimate[1],
                                               'timestamp':timestamp})
        else:
            timestamps = sorted(self.actuals['timestamp'].unique())
            for index, timestamp in timestamps.items():
                region_result_estimate = self.get_estimate(timestamp, region_id)
                region_result['estimates'].append(  {'value':region_result_estimate[0],
                                                     'extra_data': region_result_estimate[1],
                                                     'timestamp': timestamp}
                                                    )
        return region_result


    def get_adjacent_regions(self, region_ids, ignore_regions):
        # Create an empty list for adjacent regions
        adjacent_regions =  []
        # Get all adjacent regions for each region
        df_reset = self.regions.reset_index()
        for region_id in region_ids:
            regions_temp = df_reset.loc[df_reset['region_id'] == region_id]
            if len(regions_temp.index) > 0:
                adjacent_regions.extend(regions_temp['neighbours'].iloc[0].split(','))

        # Return all adjacent regions as a querySet and remove any that are in the completed/ignore list.
        return [x for x in adjacent_regions if x not in ignore_regions]



    def __get_all_region_neighbours(self):
        for index, region in self.regions.iterrows():
            neighbors = self.regions[self.regions.geometry.touches(region.geometry)].index.tolist()
            neighbors = filter(lambda item: item != index, neighbors)
            self.regions.at[index, "neighbours"] = ",".join(neighbors)


    def __get_all_region_sensors(self):
        for index, region in self.regions.iterrows():
            sensors = self.sensors[self.sensors.geometry.within(region['geometry'])].index.tolist()
            self.regions.at[index, "sensors"] = ",".join(str(x) for x in sensors)