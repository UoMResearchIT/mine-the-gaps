from django import forms
from django_range_slider.fields import RangeSliderField

class FileUploadForm(forms.Form):
    actual_data_file = forms.FileField(required=False, help_text="Actual data file")
    sensor_data_file = forms.FileField(required=False, help_text="Sensor metadata file")

    estimated_data_file = forms.FileField(required=False, help_text="Estimated data file")
    region_data_file = forms.FileField(required=False, help_text="Region metadata file")




class SliderForm(forms.Form):
     #name_range_field = RangeSliderField(minimum=30,maximum=300,name="TestName") # with name inside the input field (no label)
     #range_field = RangeSliderField(minimum=10,maximum=102) # without name or label
     date_range_slider = RangeSliderField(label="Time stamp",minimum=1,maximum=10) # with label (no name)

     def set_range(self, min=0, max=10):
         self.date_range_slider.minimum=min
         self.date_range_slider.maximum=max