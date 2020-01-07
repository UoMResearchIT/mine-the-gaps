from mine_the_gap.region_estimators.region_estimator import Region_estimator
import pandas as pd


class Diffusion_estimator(Region_estimator):

    def __init__(self, sensors, regions, actuals):
        super(Diffusion_estimator, self).__init__(sensors, regions, actuals)

    class Factory:
        def create(self, sensors, regions, actuals): return Diffusion_estimator(sensors, regions, actuals)


    def get_estimate(self, timestamp, region_id):
        # Create a queryset with just the single input region
        #regions = Region.objects.none()
        #regions |= region

        # Create an empty list for storing completed regions
        regions_completed = []

        # Check there are sensors for this timestamp
        if len(self.actuals.loc[self.actuals['timestamp'] == timestamp]) == 0:
            return None, {'rings': None}

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive([region_id], timestamp, 0, regions_completed)


    def get_diffusion_estimate_recursive(self, region_ids, timestamp, diffuse_level, regions_completed):
        # Create an empty queryset for sensors found in regions
        sensors = []

        # Find sensors
        df_reset = pd.DataFrame(self.regions.reset_index())
        for region_id in region_ids:
            regions_temp = df_reset.loc[df_reset['region_id'] == region_id]
            if len(regions_temp.index) > 0:
                region_sensors = regions_temp['sensors'].iloc[0]
                if len(region_sensors.strip()) > 0:
                    sensors.extend(region_sensors.split(','))


        # Get values from sensors
        actuals = self.actuals.loc[(self.actuals['timestamp'] == timestamp) & (self.actuals['sensor'].isin(sensors))]

        result = None
        if len(actuals) > 0:
            # If readings found for the sensors, take the average
            result = actuals['value'].mean(axis=0)

        if result is None or pd.isna(result):
            # If no readings/sensors found, go up a diffusion level (adding completed regions to ignore list)
            regions_completed.extend(region_ids)
            diffuse_level += 1

            # Find the next set of regions
            next_regions = self.get_adjacent_regions(region_ids, regions_completed)

            # If regions are found, continue, if not exit from the process
            if len(next_regions) > 0:
                return self.get_diffusion_estimate_recursive(next_regions, timestamp, diffuse_level, regions_completed)
            else:
                return None, {'rings': diffuse_level}
        else:
            return result, {'rings': diffuse_level}
