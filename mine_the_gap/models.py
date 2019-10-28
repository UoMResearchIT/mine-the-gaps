from django.contrib.gis.db import models as gismodels


class Actual_data(gismodels.Model):
    timestamp = gismodels.DateField(null=False)
    geom = gismodels.PointField(null=True)
    value = gismodels.FloatField(null=True)


class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=True)
    name = gismodels.CharField(max_length=50, null=True)
    metadata = gismodels.CharField(max_length=500, null=True)


class Estimated_data(gismodels.Model):
    region_label = gismodels.CharField(max_length=50, null=False)
    timestamp = gismodels.DateField(null=False)
    value = gismodels.FloatField(null=True)
    metadata = gismodels.CharField(max_length=500, null=True)


class Region_data(gismodels.Model):
    region_label = gismodels.CharField(max_length=30, null=True)
    geom = gismodels.PolygonField(max_length=2000)
    metadata = gismodels.CharField(max_length=20000, null=True)