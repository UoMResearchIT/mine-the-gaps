from shapely.ops import nearest_points
import geopandas as pd

from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Distance_simple_estimator(Region_estimator):

    def __init__(self, sensors, regions, actuals):
        super(Distance_simple_estimator, self).__init__(sensors, regions, actuals)

    class Factory:
        def create(self, sensors, regions, actuals): return Distance_simple_estimator(sensors, regions, actuals)



    def get_estimate(self, timestamp, region):
        result = None, {'closest_sensor_data': None}

        # Get the actual values

        actuals = self.actuals.loc[
            self.actuals['sensor_id'] in self.sensors['sensor_id'] and
            self.actuals['value'] is not None and
            self.actuals['timestamp'] == timestamp]

        actuals = pd.merge(left=actuals, right=self.sensors ,on='sensor_id', how='left')

        # Get the closest sensor to the region
        if len(actuals) > 0:
            # self.regions[self.regions.geometry.touches(region['geometry'])].name.tolist()

            actual = actuals['geometry'].distance(region.geometry).sort_values(by=['distance'], ascending=False)[0]

            # Get the value for that sensor on that timestamp
            if actual:
                # If readings found for the sensors, take the average
                result = actual['value'], {'closest_sensor_id': str(actual['sensor_name'])}

        return result