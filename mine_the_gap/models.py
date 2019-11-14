from django.db import models
from django.contrib.postgres.fields import JSONField
from django.contrib.gis.db import models as gismodels
from django.contrib.gis.geos import Point
import json


class Filenames(models.Model):
    actual_data_file = models.CharField(max_length=50, null=True)
    sensor_data_file = models.CharField(max_length=50, null=True)
    estimated_data_file = models.CharField(max_length=50, null=True)
    region_data_file = models.CharField(max_length=50, null=True)




class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=False, db_index=True)
    name = models.CharField(max_length=50, null=True)
    extra_data = JSONField(null=True)

    @property
    def popupContent(self):
        return {'sensor_id': self.id,
                'name': self.name,
                'extra_data': self.extra_data}



class Actual_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    value = models.FloatField(null=True)
    sensor = models.ForeignKey(Sensor, null=True, on_delete=models.CASCADE)
    extra_data = JSONField(null=True)

    @property
    def join_sensor(self):
        try:
            fvalue = float(self.value)
        except:
            fvalue = None
        return {'timestamp': self.timestamp,
                'name': self.sensor.name,
                'value': fvalue,
                'sensor_id': self.sensor_id,
                'geom': self.sensor.geom.coords,
                'extra_data': self.sensor.extra_data}




class Region(gismodels.Model):
    region_id = models.CharField(max_length=30, primary_key=True)
    geom = gismodels.MultiPolygonField(max_length=2000, null=False)
    extra_data = JSONField(null=True)

    def __unicode__(self):
        return self.region_label

    @property
    def popupContent(self):
        return {'region_id': self.region_id, 'extra_data': self.extra_data}

    @property
    def adjacent_regions(self):
        return Region.objects.filter(geom__touches=self.geom)




class Estimated_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    value = models.FloatField(null=True)
    extra_data = JSONField(null=True)
    region = models.ForeignKey(Region, null=True, on_delete=models.CASCADE)

    @property
    def join_region(self):
        return {'timestamp': self.timestamp,
                'value': self.value,
                'region_id': self.region_id,
                'geom': self.region.geom.coords,
                'extra_data': self.extra_data,
                'region_extra_data': self.region.extra_data}




