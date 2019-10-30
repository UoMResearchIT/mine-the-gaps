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
        return self.extra_data

class Actual_data(gismodels.Model):
    timestamp = models.DateField(null=False)
    value = models.FloatField(null=True)
    sensor = models.ForeignKey(Sensor, null=True, on_delete=models.CASCADE)



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
    timestamp = models.DateField(null=False)
    value = models.FloatField(null=True)
    extra_data = models.CharField(max_length=500, null=True)
    region = models.ForeignKey(Region, null=True, on_delete=models.CASCADE)

    @property
    def popupContent(self):
        return {'region_id': self.region.region_id, 'extra_data': self.extra_data}




