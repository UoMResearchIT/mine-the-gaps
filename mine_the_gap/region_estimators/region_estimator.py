from abc import ABCMeta, abstractmethod
import geopandas as gpd



class RegionEstimator(object):
    """
        Abstract class, parent of region estimators (each implementing a different estimation method).
        Requires GeoPandas and Pandas
    """
    __metaclass__ = ABCMeta

    def __init__(self, sensors, regions, actuals):
        """ Initialise instance of the RegionEstimator class.

            Args:
                sensors: list of sensors as pandas.DataFrame
                    Required columns:
                        'sensor_id' (integer)
                        'latitude' (float): latitude of sensor location
                        'longitude' (float): longitude of sensor location

                regions: list of regions as pandas.DataFrame
                    Required columns:
                        'region_id' (string)
                        'geom' (shapely.wkt/geom.wkt)
                actuals: list of sensor values as pandas.DataFrame
                    Required columns:
                        'timestamp' (string): timestamp of actual reading
                        'sensor' (integer): ID of sensor which took actual reading
                        'value' (float): value of actual reading

            Returns:
                Initialised instance of subclass of RegionEstimator

        """
        gdf_sensors = gpd.GeoDataFrame(data=sensors,
                                       geometry=gpd.points_from_xy(sensors.longitude, sensors.latitude))
        gdf_sensors = gdf_sensors.drop(columns=['longitude', 'latitude'])

        gdf_regions = gpd.GeoDataFrame(data=regions, geometry='geometry')
        gdf_regions = gdf_regions.drop(columns=['geom'])

        self.sensors = gdf_sensors
        self.regions = gdf_regions
        self.actuals = actuals

        self.__get_all_region_neighbours()
        self.__get_all_region_sensors()


    @abstractmethod
    def get_estimate(self, timestamp, region_id):
        raise NotImplementedError("Must override get_estimate")


    def get_estimations(self, region_id=None, timestamp=None):
        """  Find estimations for a region (or all regions if region_id==None) and
                timestamp (or all timestamps (or all timestamps if timestamp==None)

            :param region_id: region identifier (string or None)
            :param timestamp:  timestamp identifier (string or None)

            :return: json list of dicts, each with
                i) 'region_id' and
                ii) calculated 'estimates' (list of dicts, each containing 'value', 'extra_data', 'timestamp')
        """
        if region_id:
            #region = self.regions.loc[self.regions.index == region_id]
            result = [self.get_region_estimation(region_id, timestamp)]
        else:
            result = []
            for index, region in self.regions.iterrows():
                result.append(self.get_region_estimation(index, timestamp))

        return result


    def get_region_estimation(self, region_id, timestamp=None):
        """  Find estimations for a region and timestamp (or all timestamps (or all timestamps if timestamp==None)

            :param region_id: region identifier (string)
            :param timestamp:  timestamp identifier (string or None)

            :return: a dict containing:
                i) 'region_id' and
                ii) calculated 'estimates' (list of dicts, each containing 'value', 'extra_data', 'timestamp')
        """
        region_result = {'region_id': region_id, 'estimates':[]}

        if timestamp is not None:
            region_result_estimate = self.get_estimate(timestamp, region_id)
            region_result['estimates'].append({'value':region_result_estimate[0],
                                               'extra_data': region_result_estimate[1],
                                               'timestamp':timestamp})
        else:
            timestamps = sorted(self.actuals['timestamp'].unique())
            for index, timestamp in enumerate(timestamps):
                region_result_estimate = self.get_estimate(timestamp, region_id)
                region_result['estimates'].append(  {'value':region_result_estimate[0],
                                                     'extra_data': region_result_estimate[1],
                                                     'timestamp': timestamp}
                                                    )
        return region_result


    def get_adjacent_regions(self, region_ids, ignore_regions):
        """  Find all adjacent regions for list a of region ids

            :param region_ids: list of region identifier (list of strings)
            :param ignore_regions:  list of region identifier (list of strings): list to be ignored

            :return: a list of regions_ids
        """

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
        '''
        Find all of the neighbours of each region and add to a 'neigbours' column in self.regions -
        as comma-delimited string of region_ids

        :return: No return value
        '''
        for index, region in self.regions.iterrows():
            neighbors = self.regions[self.regions.geometry.touches(region.geometry)].index.tolist()
            neighbors = filter(lambda item: item != index, neighbors)
            self.regions.at[index, "neighbours"] = ",".join(neighbors)


    def __get_all_region_sensors(self):
        '''
            Find all of the sensors within each region and add to a 'sensors' column in self.regions -
            as comma-delimited string of sensor ids.

            :return: No return value
        '''
        for index, region in self.regions.iterrows():
            sensors = self.sensors[self.sensors.geometry.within(region['geometry'])].index.tolist()
            self.regions.at[index, "sensors"] = ",".join(str(x) for x in sensors)