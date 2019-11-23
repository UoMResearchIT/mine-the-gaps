from django.db import models
from django.contrib.postgres.fields import JSONField
from django.contrib.gis.db import models as gismodels
import json


class Filenames(models.Model):
    actual_data_file = models.CharField(max_length=50, null=True)
    sensor_data_file = models.CharField(max_length=50, null=True)
    estimated_data_file = models.CharField(max_length=50, null=True)
    region_data_file = models.CharField(max_length=50, null=True)



class Sensor(gismodels.Model):
    geom = gismodels.PointField(null=False)
    name = models.CharField(max_length=50, db_index=True, null=True)
    extra_data = JSONField(null=True)

    @property
    def popup_content(self):
        return {'sensor_id': self.id,
                'name': self.name,
                'extra_data': self.extra_data}

    @property
    def csv_line_headers(self):
        extra_data_headers = []

        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            extra_data_headers.append(str(key))

        result = ['name','long','lat']
        result.extend(extra_data_headers)
        return result

    @property
    def csv_line(self):
        extra_data_csv = []

        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            try:
                extra_data_csv.append(int(self.extra_data[key]))
            except:
                try:
                    extra_data_csv.append(float(self.extra_data[key]))
                except:
                    extra_data_csv.append(str(self.extra_data[key]))

        result = [self.name, str(self.geom[0]), str(self.geom[1])]
        result.extend(extra_data_csv)
        return result



class Actual_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    sensor = models.ForeignKey(Sensor, null=True, on_delete=models.CASCADE)

    @property
    def join_sensor(self):
        return {'timestamp': self.timestamp,
                'name': self.sensor.name,
                'sensor_id': self.sensor_id,
                'geom': self.sensor.geom.coords,
                'sensor_extra_data': self.sensor.extra_data}



class Actual_value(gismodels.Model):
    actual_data = models.ForeignKey(Actual_data, null=True, on_delete=models.CASCADE)
    measurement_name = models.CharField(max_length=30, null=False, db_index=True)
    value = models.FloatField(null=True)
    extra_data = JSONField(null=True)

    @property
    def join_sensor(self):
        try:
            fvalue = float(self.value)
        except:
            fvalue = None
        result = self.actual_data.join_sensor
        result.update({'measurement_name': self.measurement_name,
                       'value': fvalue,
                       'actual_data_id': self.actual_data_id,
                       'extra_data': self.extra_data})
        return result

    @property
    def csv_line_headers(self):
        extra_data_headers = ''
        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            extra_data_headers += '"' + str(key) + '",'
        extra_data_headers = extra_data_headers.strip(',')

        return 'timestamp,sensor_id,measurement,value,' + extra_data_headers

    @property
    def csv_line(self):
        extra_data_csv = ''
        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            try:
                extra_data_csv += int(self.extra_data[key]) + ','
            except:
                try:
                    extra_data_csv += float(self.extra_data[key]) + ','
                except:
                    extra_data_csv += '"' + str(self.extra_data[key]) + '",'

        extra_data_csv = extra_data_csv.strip(',')

        return self.actual_data.timestamp + ',' + str(self.actual_data.sensor_id) + ',' \
               + self.measurement_name + ',' + str(self.value) + ',' + extra_data_csv




class Region(gismodels.Model):
    region_id = models.CharField(max_length=30, primary_key=True)
    geom = gismodels.MultiPolygonField(null=False)
    extra_data = JSONField(null=True)

    def __unicode__(self):
        return self.region_label

    @property
    def popup_content(self):
        return {'region_id': self.region_id, 'extra_data': self.extra_data}

    @property
    def adjacent_regions(self):
        return Region.objects.filter(geom__touches=self.geom)


    @property
    def csv_line_headers(self):
        extra_data_headers = []

        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            extra_data_headers.append(str(key))

        result = ['region_id', 'geom']
        result.extend(extra_data_headers)
        return result

    @property
    def csv_line(self):
        extra_data_csv = []
        sorted_extra = sorted(self.extra_data)

        for key in sorted_extra:
            try:
                extra_data_csv.append(int(self.extra_data[key]))
            except:
                try:
                    extra_data_csv.append(float(self.extra_data[key]))
                except:
                    extra_data_csv.append(str(self.extra_data[key]))

        result = [self.region_id, json.loads(self.geom.json)['coordinates']]
        result.extend(extra_data_csv)
        return result




class Estimated_data(gismodels.Model):
    timestamp = models.CharField(max_length=30, null=False)
    region = models.ForeignKey(Region, null=True, on_delete=models.CASCADE)

    @property
    def join_region(self):
        return {'timestamp': self.timestamp,
                'region_id': self.region_id,
                'geom': self.region.geom.coords,
                'region_extra_data': self.region.extra_data}


class Estimated_value(gismodels.Model):
    estimated_data = models.ForeignKey(Estimated_data, null=True, on_delete=models.CASCADE)
    measurement_name = models.CharField(max_length=30, null=False, db_index=True)
    value = models.FloatField(null=True)
    extra_data = JSONField(null=True)

    @property
    def join_region(self):
        try:
            fvalue = float(self.value)
        except:
            fvalue = None
        result = self.estimated_data.join_region
        result.update({'measurement_name': self.measurement_name,
                       'value': fvalue,
                       'estimated_data_id': self.estimated_data_id,
                       'extra_data': self.extra_data})
        return result

    @property
    def csv_line_headers(self):
        extra_data_headers = ''
        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            extra_data_headers += '"' + str(key) + '",'
        extra_data_headers = extra_data_headers.strip(',')

        return 'timestamp,region_id,measurement,value,' + extra_data_headers

    @property
    def csv_line(self):
        extra_data_csv = ''
        sorted_extra = sorted(self.extra_data)
        for key in sorted_extra:
            try:
                extra_data_csv += int(self.extra_data[key]) + ','
            except:
                try:
                    extra_data_csv += float(self.extra_data[key]) + ','
                except:
                    extra_data_csv += '"' + str(self.extra_data[key]) + '",'

        extra_data_csv = extra_data_csv.strip(',')

        return self.estimated_data.timestamp + ',' + str(self.estimated_data.region_id) + ',' \
               + self.measurement_name + ',' + str(self.value) + ',' + extra_data_csv