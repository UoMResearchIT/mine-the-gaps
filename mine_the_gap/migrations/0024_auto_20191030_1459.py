# Generated by Django 2.0.13 on 2019-10-30 14:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0023_auto_20191030_1355'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='region',
            name='id',
        ),
        migrations.RemoveField(
            model_name='region',
            name='region_label',
        ),
        migrations.AddField(
            model_name='region',
            name='region_id',
            field=models.CharField(default='XX', max_length=30, primary_key=True, serialize=False),
            preserve_default=False,
        ),
    ]