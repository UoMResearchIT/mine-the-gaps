from django.db import models
from django.contrib.gis.db import models as gismodels


class Actual_data(gismodels.Model):
    timestamp = models.DateField(null=False)
    geom = gismodels.PointField(null=True)
    value = models.FloatField(null=True)


class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=True)
    name = models.CharField(max_length=50, null=True)
    extra_data = gismodels.CharField(max_length=500, null=True)

    def __unicode__(self):
        return self.name

    @property
    def popupContent(self):
        return self.extra_data


class Estimated_data(gismodels.Model):
    region_label = models.CharField(max_length=50, null=False)
    timestamp = models.DateField(null=False)
    value = models.FloatField(null=True)
    extra_data = models.CharField(max_length=500, null=True)


class Region_data(gismodels.Model):
    region_label = models.CharField(max_length=30, null=True)
    geom = gismodels.MultiPolygonField(max_length=2000)
    extra_data = models.CharField(max_length=20000, null=True)

    def __unicode__(self):
        return self.region_label

    @property
    def popupContent(self):
        return {'region_label': self.region_label, 'extra_data': self.extra_data}