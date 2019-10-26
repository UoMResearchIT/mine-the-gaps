from django import forms

class FileUploadForm(forms.Form):
    actual_data_file = forms.FileField(required=False)
    estimated_data_file = forms.FileField(required=False)
    region_data_file = forms.FileField(required=False)