# Generated by Django 2.0.13 on 2019-10-26 15:09

import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0006_auto_20191026_1314'),
    ]

    operations = [
        migrations.AlterField(
            model_name='region_data',
            name='polygon',
            field=django.contrib.gis.db.models.fields.PolygonField(max_length=2000, srid=4326),
        ),
    ]