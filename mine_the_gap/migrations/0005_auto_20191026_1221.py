# Generated by Django 2.0.13 on 2019-10-26 12:21

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    operations = [
        migrations.CreateModel(
            name='Actual_data',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('timestamp', models.DateField()),
                ('long', models.FloatField()),
                ('lat', models.FloatField()),
                ('value', models.FloatField(null=True)),
                ('metadata', models.CharField(max_length=500, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Estimated_data',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('timestamp', models.DateField()),
                ('value', models.FloatField(null=True)),
                ('metadata', models.CharField(max_length=500, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Region_data',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('region_label', models.CharField(max_length=30, null=True)),
                ('polygon', django.contrib.gis.db.models.fields.PolygonField(srid=4326)),
                ('metadata', models.CharField(max_length=500, null=True)),
            ],
        ),
    ]