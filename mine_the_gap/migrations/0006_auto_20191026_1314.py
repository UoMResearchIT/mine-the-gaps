# Generated by Django 2.0.13 on 2019-10-26 13:14

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mine_the_gap', '0005_auto_20191026_1221'),
    ]

    operations = [
        migrations.RenameField(
            model_name='estimated_data',
            old_name='name',
            new_name='region_label',
        ),
    ]