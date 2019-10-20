from django.contrib.gis.db import models


class Shop(models.Model):
    name = models.CharField(max_length=100, null=True)
    location = models.PointField(null=True)
    address = models.CharField(max_length=100, null=True)
    city = models.CharField(max_length=50, null=True)
