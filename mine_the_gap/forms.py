from django import forms
from django_range_slider.fields import RangeSliderField

class FileUploadForm(forms.Form):
    actual_data_file = forms.FileField(
        required=False, help_text="Actual data file (contains timestamps, site IDs and measurement values)")
    site_metadata_file = forms.FileField(
        required=False, help_text="Site metadata file (contains site ID and site metadata)")

    estimated_data_file = forms.FileField(
        required=False, help_text="Estimated data file (contains timestamps, region IDs and estimated values)")
    region_metadata_file = forms.FileField(
        required=False, help_text="Region metadata file (contains region IDs and region metadata)")

    def clean(self):
        cleaned_data = super(FileUploadForm, self).clean()

        if bool(self.cleaned_data.get('site_metadata_file')) != bool(self.cleaned_data.get('actual_data_file')):
            raise forms.ValidationError(
                'Both actual data and site meta-data files must be input for actuals upload.')

        if bool(self.cleaned_data.get('region_metadata_file')) != bool(self.cleaned_data.get('estimated_data_file')):
            raise forms.ValidationError(
                'Both estimated data and region meta-data files must be input for actuals upload.')

        if not bool(self.cleaned_data.get('region_metadata_file')) \
            and not bool(self.cleaned_data.get('estimated_data_file'))\
            and not bool(self.cleaned_data.get('actual_data_file'))\
            and not bool(self.cleaned_data.get('site_metadata_file')):
            raise forms.ValidationError(
                'No actual data nor estimatated data files have been input.')

        return cleaned_data


class SliderForm(forms.Form):
     date_range_slider = RangeSliderField(label="Time stamp", minimum=1, maximum=10) # with label (no name)

     def set_range(self, min=0, max=10):
         self.date_range_slider.minimum=min
         self.date_range_slider.maximum=max