# Generated by Django 2.0.13 on 2019-11-16 16:02

import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0035_auto_20191116_1404'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='actual_value',
            name='extra_data',
        ),
        migrations.AddField(
            model_name='actual_data',
            name='extra_data',
            field=django.contrib.postgres.fields.jsonb.JSONField(null=True),
        ),
    ]