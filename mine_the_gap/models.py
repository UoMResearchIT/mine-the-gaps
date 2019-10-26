from django.contrib.gis.db import models


class Actual_data(models.Model):
    name = models.CharField(max_length=50, null=False)
    timestamp = models.DateField(null=False)
    long = models.FloatField(null=False)
    lat = models.FloatField(null=False)
    value = models.FloatField(null=True)
    metadata = models.CharField(max_length=500, null=True)


class Estimated_data(models.Model):
    region_label = models.CharField(max_length=50, null=False)
    timestamp = models.DateField(null=False)
    value = models.FloatField(null=True)
    metadata = models.CharField(max_length=500, null=True)


class Region_data(models.Model):
    region_label = models.CharField(max_length=30, null=True)
    polygon = models.PolygonField(max_length=2000)
    metadata = models.CharField(max_length=20000, null=True)