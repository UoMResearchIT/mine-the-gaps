[![Django CI](https://github.com/UoMResearchIT/geo_sensor_gaps/actions/workflows/django.yml/badge.svg)](https://github.com/UoMResearchIT/geo_sensor_gaps/actions/workflows/django.yml)

The sections below are:
- [About](#about)
- [Example screenshots](#example-screenshots)
- [Test locally](#test-locally)
- [Deployment](#deployment)  
- [User instructions](#user-instructions)  
  - [Admin users](#admin-users)
  - [General users](#general-users)
- [Acknowledgements](#acknowledgements)  
- [Copyright and Licensing](#copyright--licensing)

<!-- toc -->

## About
A Django web application that shows sensor data on a map and compares with regional estimates.
All data is loaded into the web app model/DB by the (admin) user at runtime, from 4 CSV files 
which must comprise 2 data files and 2 metadata files. 
Examples are provided in the `/examples` folder. See the Data files section below.
 

General users of this web app can also upload their own data locally (with a browser/session), 
again via a CSV file upload, so that their own data can be compared alongside the 
actuals/estimates data pre-loaded.

# Example screenshots

## Example with daily UK AQ data
(currently running on our web app deployment: see http://minethegaps.manchester.ac.uk/)
![alt text](images/mine-the-gaps_general_screenshot.png)

## Example with yearly Arizona Chloride PM2.5 LC data
![Arizona_Chloride](images/mine-the-gaps_screenshot_US_Arizona_Chloride.png)


# Test locally
How to set up a test version running on a development (test) server. 
The following notes are to get this web app running on *your own machine*, using Django's 
development server which runs on your machine's localhost.

## Clone this repository 
Make a copy of this code on your computer by:

`cd ~/Code/` [cd to a folder on your local machine where you would like to install this code]

and then either:

`git clone  https://github.com/UoMResearchIT/geo_sensor_gaps.git`

or:

 click on 'Code' on this github repository homepage, then 'Download ZIP' and save to your chosen folder.
 Then extract this zip file.

## Install dependencies
  
  These instructions are based on the Ubuntu OS. They will need to be adapted to run on other Linux distributions,
  Windows and other OSs.

  This web app is tested on python versions 3.7, 3.8 and 3.9

        sudo apt-get update
        sudo apt-get install -y libproj-dev libgeos-dev gdal-bin libgdal-dev libsqlite3-mod-spatialite
        python -m pip install --upgrade pip

## Virtual Environment

See https://docs.python.org/3/tutorial/venv.html for instruction on how to set up a virtual environment 
(recommended). This virtual environment will hold the required version of Python, Django and other 
necessary modules.

To activate your new virtual environment run:

`source venv/bin/activate` [Replace 'venv' with the path to your new virtual environment]
      
## Install Django and additional modules. 

Ensure that your newly created virtual environment is activated (see above), and then run:

    cd [code-directory] [Replace [code-directory] with the path of the project folder that contains requirements.txt]
    pip install -r requirements.txt

## Install the PostGIS (Spatial PostreSQL database)
As this web app requires geographical functionality, we can't rely only on Django's default
database set-up. We require a database that can hold and process geo-spatial data and 
PostGIS is used for this purpose.
For general documentation on PostGIS see https://postgis.net/docs/

Within the above instructions, there are installation instructions found at: 
https://postgis.net/docs/postgis_installation.html#install_short_version

For instructions on using PostGIS with Django:
https://docs.djangoproject.com/en/3.2/ref/contrib/gis/install/postgis/

## Add a local Django settings file on your machine

Using the `geo_sensor_gaps/settings/local.template` file as a template, 
create a new file `geo_sensor_gaps/settings/local.py`  (this should be in same folder as 
`local.template` and `base.py`)

Fill in the `MAX_NUM_PROCESSORS` value with an integer representing the maximum number of processors
you wish to have available for this web application. This defaults to the number available minus 1.

Fill in the `SECRET_KEY` value with a newly generate key (string) 
(e.g try this online key generator https://djecrety.ir/)

Fill in the `DATABASES` value with the following, replacing the NAME, USER and PASSWORD values with 
those set up when you created your  PostGIS database in previous step.

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'insert_your_DB_name',
        'USER': 'insert_your_db_user_name',
        'PASSWORD': 'insert_your_password',
        'HOST': 'localhost',
        'PORT': '', }
}
```


## Check Django installation
Ensure your new virtual environment is activated, and then you can check Django is installed using the following
online set-up instructions.

[Note that Django has already been installed in the previous step]
https://docs.djangoproject.com/en/3.2/intro/install/


## Run the development server
Ensure that the new virtual environment is activated and run:

 `cd [code-directory]` [Replace [code-directory] with the path of the project folder that contains requirements.txt]

optional test:
  `python manage.py test`

and
  `python manage.py runserver`

The output to the last command should be similar to:

```shell
$ python manage.py runserver

Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
July 22, 2021 - 16:15:44
Django version 3.2.5, using settings 'geo_sensor_gaps.settings.dev'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```
Using your browser, navigate to http://127.0.0.1:8000/ (or the link shown in your output) and this should 
open up the web-application.

## How to set admin users
This web application only allows admins (aka superusers) to upload the sensor and estimations data.
See the Django documents on how to do this:
https://docs.djangoproject.com/en/3.2/topics/auth/default/

# Deployment
See the Django documentation for deploying Django applications: 
https://docs.djangoproject.com/en/3.2/howto/deployment/

# User instructions

## Admin users

### Descriptions of required data files (using sample data files as example)
Sample data files are provided in the `/sample_data` folder:

* An actual sensor values data file with all timeseries data-points
  * e.g: /examples/actuals_USA_Chloride_pm25.csv
  * Mandatory fields (in order): timestamp, site_id, and at least one field with header prefix 'val_'
* A sensors metadata file
  * e.g. /examples/sensors_arizona.csv
  * Mandatory fields (in order): site_id, latitude, longitude
  * Optional fields: any field(s) that you want to show in web app for each sensor.
      e.g. State Code, County Code, Site Number, Elevation, Land Use
* A file containing estimated data-points for regions (all zeros in the dummy example file)
  * e.g. /examples/estimates_zeros.csv
  * Mandatory fields (in order): timestamp, region_id, and at least one field with header prefix 'val_'
* A regions metadata file
  * e.g. /examples/regions_arizona_counties.csv
  * Mandatory fields (in order): region, geometry
  * Optional fields: any fields that you want to show in web app for each region.
      e.g. state_id, state_name, population, county 

### How to load data to the web application
To begin with, we will load in the 4 sample data files provided, from the `/sample_data` folder, 
included in this repository (see above section for required file descriptions).

To do this: 

* Run the web app on the development server (see above) and open a browser to start the 
  web application.

* Log in by clicking on the `admin login` button at the top right-hand corner of 
  the web application and using the credentials generated in the previous step.

* On the main page, a new button `Upload environment data` will appear on the left-hand side. 
  Click on this and a pop-up will appear, asking you for 4 csv files. 
  To get started, we will use the 4 example files provided:
  
    * For the `Actual data`, `Timestamped data`, select the `actuals_USA_Chloride_pm25.csv` file.
    * For the `Actual data`, `Metadata`, select the `sensors_arizona.csv` file.
    * For the `Estimated data`, `Timestamped data`, select the `estimates_zeros.csv` file.
    * For the `Estimated data`, `Metadata`, select the `regions_arizona_counties` file.
    
* Click the `Upload` button and *DO NOT* refresh the browser until the data is loaded. If you want to
  see how the upload is progressing, open another browser tab pointing to the localhost link and refresh that tab.
  
* Once run, the map should be pointing to the centre-most sensor (USA state of Arizona in our example), and
  you should see the loaded sensor and region data.

### How to update the web-app's project info, for your own project
By default, the project panel in the top right-hand corner of the web app contains information relating to the 
repository owners' project. In addition the top section of the `Download data` pop-up box points to project related
data links. 

Currently, these can only be changed by accessing HTML files directly. Replace the HTML in the files held in the 
`/templates/flexible_content/` folder with your desired content.

## General users

### Getting started
Click on a site to see site info and also the option to view site and estimated data across all timestamps.

Click on a region to see region info.

If no sites exist for this timestamp (map may be grayed out), this may be because the sensor doesn't
make measurements for the current timestamp (e.g. pollen sensors in winter months). Either:

1. use slider to find another timestamp
1. use 'Select measurement' option to change measurements.

### Navigate data using time line
Click on the `Timestamp` slider bar to change to a different timestamp. 

### Select measurement
Click on the `Select measurement` button to switch to displaying / estimating a new measurement. 
Note that if you are using the web app with the sample data loaded, only one measurement is currently available.

### Select estimation method
The choice of estimation methods are directly linked to the `region-estimators` 
(https://github.com/UoMResearchIT/region-estimators) python package, and the 
available estimation classes available within that.

If the `pre-loaded` option is selected, this will use data in the estimated, timestamped data that was loaded
by the admin user. (If the example files were used, this data will contain all zeros.)

For other options (e.g. `concentric-regions' or `distance-simple`) see the 
https://github.com/UoMResearchIT/region-estimators repo for details.

Note that some estimation methods may take a while to run, particularly when running a time-series graphs.

### Run a time-series graph 
Time-series graphs can be generated for a sensor, that compares the actual sensor measurement readings with estimated
sensor values, calculated if that sensor did not exist. 

Click on a sensor to view sensor metadata and click on the `Get timeseries` button. 

Note that some estimation methods might take longer to run than others. 

Also note that if using `pre-loaded` estimation method, even if you have loaded your own non-zero estimated data file, 
this comparison won't fully make sense as the estimations are not calculated at runtime, so the
`Estimated values` will have been calculated with that sensor's data being present.

### Filter sites
Click on the `Filter sites by...` button to filter sites by selecting or omitting values. Note that the fields that
can be used for filtering are the optional fields loaded in from the sensors metadata file. 

Once sites are filtered in/out, only the select sites will be used in estimation calculations.

Currently, only 'Select values' and 'Omit values' are implemented, which is not useful if the field contains a large 
or uncountable set of values (ie continuous values), e.g. `Elevation`.  Improving the filtering is future work.


### Upload your own data locally via CSV file
This web app allows you to compare your own timeseries, geo data with the pre-loaded sensor and estimations data. 
Again, this is loaded as a CSV file.

Click on the `Upload data and visualise` button and full instructions on the CSV file format, headers etc is 
displayed, along with a `Choose file` button to select your file.

### Download data and API
Click on the `Download data` button. Full instructions on downloading data and/or using the API are shown in the
pop-up box.

# Research

## Acknowledgement
This web application is part of the project "Understanding the relationship between human health 
and the environment' funded by the Alan Turing Institute

## Authors
Ann Gledson, Douglas Lowe, David Topping and Caroline Jay


# Copyright & Licensing

This software has been developed by Ann Gledson from the 
[Research IT](https://research-it.manchester.ac.uk/) 
group at the [University of Manchester](https://www.manchester.ac.uk/).

(c) 2020-2021 University of Manchester.
Licensed under the MIT license, see the file LICENSE for details.



  



