import pandas as pd
import geopandas as gpd

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Distance_simple_estimator(Region_estimator):

    def __init__(self, sensors, regions, actuals):
        super(Distance_simple_estimator, self).__init__(sensors, regions, actuals)

    class Factory:
        def create(self, sensors, regions, actuals): return Distance_simple_estimator(sensors, regions, actuals)



    def get_estimate(self, timestamp, region_id):
        result = None, {'closest_sensor_data': None}

        # Get the actual values

        df_actuals = self.actuals.loc[
            (self.actuals['sensor'].isin(self.sensors.index.tolist())) &
            (self.actuals['timestamp'] == timestamp) &
            (self.actuals['value'].notnull())
        ]
        print('actuals 1:')
        print(df_actuals)

        df_actuals = pd.merge(left=df_actuals,
                           right=self.sensors.reset_index().rename(columns={"id": "sensor"}),
                           on='sensor',
                           how='left')
        print('actuals 2:')
        print(df_actuals)
        gdf_actuals = gpd.GeoDataFrame(data=df_actuals, geometry='geometry')
        print('actuals 3:')
        print(gdf_actuals)

        # Get the closest sensor to the region
        if len(df_actuals) > 0:
            print('region geometry:', region.geometry)
            distances = gdf_actuals['geometry'].distance(region.geometry)
            print('distances:', distances)

            actual = distances.sort_values(ascending=False)[0]
            print('clostest actual:', actual)

            # Get the value for that sensor on that timestamp
            if actual:
                # If readings found for the sensors, take the average
                result = actual['value'], {'closest_sensor_id': str(actual['sensor_name'])}

        return result