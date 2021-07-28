# Generated by Django 2.0.13 on 2019-11-17 11:13

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0037_auto_20191116_1614'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sensor',
            name='geom',
            field=django.contrib.gis.db.models.fields.PointField(srid=4326),
        ),
        migrations.AlterField(
            model_name='sensor',
            name='name',
            field=models.CharField(db_index=True, max_length=50, null=True),
        ),
    ]