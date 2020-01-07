import pandas as pd
import geopandas as gpd

from mine_the_gap.region_estimators.region_estimator import RegionEstimator


class DistanceSimpleEstimator(RegionEstimator):

    def __init__(self, sensors, regions, actuals):
        super(DistanceSimpleEstimator, self).__init__(sensors, regions, actuals)

    class Factory:
        def create(self, sensors, regions, actuals):
            return DistanceSimpleEstimator(sensors, regions, actuals)



    def get_estimate(self, timestamp, region_id):
        """  Find estimations for a region and timestamp using the simple distance method: value of closest actual sensor

            :param timestamp:  timestamp identifier (string)
            :param region_id: region identifier (string)

            :return: tuple containing result and dict: {'closest_sensor_id': [ID of closest sensor]}

        """
        result = None, {'closest_sensor_data': None}

        # Get the actual values

        df_actuals = self.actuals.loc[
            (self.actuals['sensor'].isin(self.sensors.index.tolist())) &
            (self.actuals['timestamp'] == timestamp) &
            (self.actuals['value'].notnull())
        ]

        df_actuals = pd.merge(left=df_actuals,
                           right=self.sensors.reset_index().rename(columns={"id": "sensor"}),
                           on='sensor',
                           how='left')
        gdf_actuals = gpd.GeoDataFrame(data=df_actuals, geometry='geometry')

        # Get the closest sensor to the region
        if len(gdf_actuals) > 0:
            df_reset = pd.DataFrame(self.regions.reset_index())
            regions_temp = df_reset.loc[df_reset['region_id'] == region_id]
            if len(regions_temp.index) > 0:
                region = regions_temp.iloc[0]
            distances = pd.DataFrame(gdf_actuals['geometry'].distance(region.geometry))
            distances = distances.merge(gdf_actuals, left_index=True, right_index=True)

            actual = distances.sort_values(by=[0], ascending=True).iloc[0]

            # Get the value for that sensor on that timestamp
            if actual is not None:
                # If readings found for the sensors, take the average
                result = actual['value'], {'closest_sensor_id': str(actual['name'])}

        return result