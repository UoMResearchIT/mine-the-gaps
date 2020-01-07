# Polymorphic factory methods.
from __future__ import generators

# These region estimators must stay - despite not appearing to be used!!
from mine_the_gap.region_estimators.diffusion_estimator import DiffusionEstimator
from mine_the_gap.region_estimators.distance_simple_estimator import DistanceSimpleEstimator


class RegionEstimatorFactory:
    factories = {}


    def add_factory(id, region_estimator_factory):
        RegionEstimatorFactory.factories.put[id] = region_estimator_factory
    add_factory = staticmethod(add_factory)

    # A Template Method:
    def create(method_name, sensors=None, regions=None, actuals=None):
        class_name = get_classname(method_name)
        if class_name not in RegionEstimatorFactory.factories:
            RegionEstimatorFactory.factories[class_name] = eval(class_name + '.Factory()')
        return RegionEstimatorFactory.factories[class_name].create(sensors, regions, actuals)

    region_estimator = staticmethod(create)



def get_classname(method_name):
    if method_name == 'diffusion':
        return 'DiffusionEstimator'
    elif method_name == 'distance-simple':
        return 'DistanceSimpleEstimator'


