from django.db import models
from django.contrib.gis.db import models as gismodels


class Actual_data(gismodels.Model):
    timestamp = models.DateField(null=False)
    geom = gismodels.PointField(null=True)
    value = models.FloatField(null=True)


class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=True)
    name = models.CharField(max_length=50, null=True)
    metadata = models.CharField(max_length=500, null=True)


class Estimated_data(gismodels.Model):
    region_label = models.CharField(max_length=50, null=False)
    timestamp = models.DateField(null=False)
    value = models.FloatField(null=True)
    metadata = models.CharField(max_length=500, null=True)


class Region_data(gismodels.Model):
    region_label = models.CharField(max_length=30, null=True)
    geom = gismodels.PolygonField(max_length=2000)
    metadata = models.CharField(max_length=20000, null=True)