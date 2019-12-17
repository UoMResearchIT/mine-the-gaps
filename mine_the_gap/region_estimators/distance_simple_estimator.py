import pandas as pd

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
            (self.actuals['sensor'].isin(self.sensors.index.tolist())) &
            (self.actuals['timestamp'] == timestamp) &
            (self.actuals['value'].notnull())
        ]

        actuals = pd.merge(left=actuals,
                           right=self.sensors.reset_index().rename(columns={"id": "sensor"}),
                           on='sensor',
                           how='left')
        print('actuals-3:')
        print(actuals)

        # Get the closest sensor to the region
        if len(actuals) > 0:
            actual = actuals['geometry'].distance(region.geometry).sort_values(by=['distance'], ascending=False)[0]

            # Get the value for that sensor on that timestamp
            if actual:
                # If readings found for the sensors, take the average
                result = actual['value'], {'closest_sensor_id': str(actual['sensor_name'])}

        return result