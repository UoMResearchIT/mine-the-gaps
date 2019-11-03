from django.db import models
from django.contrib.gis.db import models as gismodels



class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=True, db_index=True)
    name = models.CharField(max_length=50, null=True)
    extra_data = gismodels.CharField(max_length=500, null=True)

    def __unicode__(self):
        return self.name

    @property
    def popupContent(self):
        return {'sensor_id': self.id, 'extra_data': self.extra_data}



class Actual_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    value = models.FloatField(null=True)
    sensor = models.ForeignKey(Sensor, null=True, on_delete=models.CASCADE)

    @property
    def join_sensor(self):
        return {'timestamp': self.timestamp, 'value': float(self.value), 'sensor_id': self.sensor_id,
                'geom': self.sensor.geom.coords, 'extra_data': self.sensor.extra_data}




class Region(gismodels.Model):
    region_id = models.CharField(max_length=30, primary_key=True)
    geom = gismodels.MultiPolygonField(max_length=2000)
    extra_data = models.CharField(max_length=20000, null=True)

    def __unicode__(self):
        return self.region_label

    @property
    def popupContent(self):
        return {'region_id': self.region_id, 'extra_data': self.extra_data}

class Estimated_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    value = models.FloatField(null=True)
    extra_data = models.CharField(max_length=500, null=True)
    region = models.ForeignKey(Region, null=True, on_delete=models.CASCADE)

    @property
    def join_region(self):
        return {'timestamp': self.timestamp, 'value': self.value, 'region_id': self.region_id,
                'geom': self.region.geom.coords, 'extra_data': self.extra_data, 'region_extra_data': self.region.extra_data}




