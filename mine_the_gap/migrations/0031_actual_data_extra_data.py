# Generated by Django 2.0.13 on 2019-11-06 08:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0030_filenames'),
    ]

    operations = [
        migrations.AddField(
            model_name='actual_data',
            name='extra_data',
            field=models.CharField(max_length=500, null=True),
        ),
    ]