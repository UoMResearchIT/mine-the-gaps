from mine_the_gap.region_estimators.region_estimator import Region_estimator


class Diffusion_estimator(Region_estimator):

    def __init__(self, sensors, regions, actuals):
        super(Diffusion_estimator, self).__init__(sensors, regions, actuals)

    class Factory:
        def create(self, sensors, regions, actuals): return Diffusion_estimator(sensors, regions, actuals)


    def get_estimate(self, timestamp, region):
        # Create a queryset with just the single input region
        #regions = Region.objects.none()
        #regions |= region

        # Create an empty list for storing completed regions
        regions_completed = []

        # Check there are sensors for this timestamp
        if len(self.actuals.loc[self.actuals['timestamp'] == timestamp]) == 0:
            return None, {'rings': None}

        # Recursively find the sensors in each diffusion ring (starting at 0)
        return self.get_diffusion_estimate_recursive(region, timestamp, 0, regions_completed)


    def get_diffusion_estimate_recursive(self, regions, timestamp, diffuse_level, regions_completed):
        # Create an empty queryset for sensors found in regions
        sensors = []

        # Find sensors
        for index, region in regions.iterrows():
            sensors.extend(region['sensors'].split(','))

        # Get values from sensors
        actuals = self.actuals.loc[(self.actuals['timestamp'] == timestamp) & (self.actuals['sensor'].isin(sensors))]

        if len(actuals) > 0:
            # If readings found for the sensors, take the average
            result = actuals['value'].mean(axis=0)
            return result, {'rings': diffuse_level}
        else:
            # If no readings/sensors found, go up a diffusion level (adding completed regions to ignore list)
            print(regions.index)
            regions_completed.extend(regions.index)
            diffuse_level += 1

            # Find the next set of regions
            next_regions = self.get_adjacent_regions(regions, regions_completed)

            # If regions are found, continue, if not exit from the process
            if next_regions.count() > 0:
                return self.get_diffusion_estimate_recursive(next_regions, timestamp, diffuse_level, regions_completed)
            else:
                return None, {'rings': diffuse_level}