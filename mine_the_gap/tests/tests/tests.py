from django.test import TestCase
from django.contrib.gis.geos import MultiPolygon, Polygon

from mine_the_gap.models import Filenames, Region, Sensor, Estimated_data, Estimated_value, Actual_data, Actual_value


class RegionModelTests(TestCase):

    def test_pop_up_content(self):
        """
        creates a new Region and then checks contents of pop_up_content
        """

        p1 = Polygon(((0, 0), (0, 1), (1, 1), (0, 0)))
        p2 = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))
        mp = MultiPolygon(p1, p2)
        region = Region(
            region_id='AB',
            geom=mp,
            extra_data={'extra_field': 'test_value'})
        self.assertIs(region.extra_data['extra_field'], 'test_value')
