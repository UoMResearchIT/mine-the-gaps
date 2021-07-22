[![Django CI](https://github.com/UoMResearchIT/geo_sensor_gaps/actions/workflows/django.yml/badge.svg)](https://github.com/UoMResearchIT/geo_sensor_gaps/actions/workflows/django.yml)

The sections below are:
- [About](#about)
- [Example screenshots](#example-screenshots)
- [Test locally](#test-locally)
- [User instructions](#user-instructions)  
- [Copyright and Licensing](#copyright--licensing)

<!-- toc -->

## About
A Django web application that shows sensor data on a map and compares with regional estimates.
All data is loaded into the web app by the (admin) user at runtime, via 4 CSV files comprised of 2 data files and 2 metadata files:
* actuals.csv
* sensors.csv
* estimates.csv
* regions.csv

General users of this web app can also upload their own data locally (with a browser/session), 
again via a CSV file upload, so that their own data can be compared alongside the 
actuals/estimates data pre-loaded.

# Example screenshots

## Example with daily UK AQ data 
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

  Runs on python versions 3.7, 3.8 and 3.9

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

    `cd [code-directory]/geo_sensor_gaps` [Rpalce [code-directory] with the path of the project files folder that
                                            contains requirements.txt]
    `pip install -r requirements.txt`

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
creata a new file `geo_sensor_gaps/settings/local.py`  (this should be in same folder as 
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

 `cd [code-directory]/geo_sensor_gaps` [Repalce [code-directory] with the path of the project files 
                                        folder that contains requirements.txt]

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


# User instructions

## Admin users

### How to load data and use the web application
To begin with, we will load in the 4 sample data files provided, from the `/sample_data` folder, included 
in this repository.

To do this: 

* Run the web app on the development server (see above) and open browser / web application.

* Click on the  `admin login` button at the top right-hand corner of the web application.

* Use the credentials generated in the previous step to log in.

* On the main page, a new button `Upload environment data` will appear on the left-hand side. Click on this.
A pop-up will appear and you are asked for 4 csv files. 
  
    * For the `Actual data`, `Timestamped data`, select the `actuals_USA_Chloride_pm25.csv` file.
    * For the `Actual data`, `Metadata`, select the `sensors_arizona.csv` file.
    * For the `Estimated data`, `Timestamped data`, select the `estimates_zeros.csv` file.
    * For the `Estimated data`, `Metadata`, select the `regions_arizona_counties` file.
    
* Click the `Upload` button and *DO NOT* refresh the browser until the data is loaded. If you want to
see how the upload is progressing, open another browser tab pointing to the localhost link.
  
* Once run, check that the map is pointing to the USA state of Arizona, to see the loaded data.

### How to update acknowlegements and `Data sources` panels for your project
Currently this can only be done by accessing the HTML file directly. The project panel in the top 
right-hand corner contains information relating to the repository owners' 
project. This can be changed in the `/templates/index.html` file. Update the contents of the 2 HTML divs:
 `<div id="site-acknowledgements">` and  `<div id="site-data">`.

## General users

### Getting started
Click on a site to see site info and also the option to view site and estimated data across all timestamps.

Click on a region to see region info.

If no sites exist for this timestamp (map may be grayed out), this may be because the sensor doesn't
make measurements for the current timestamp (e.g. pollen sensors in winter months). Either:

1. use slider to find another timestamp
1. use 'Select measurement' option to change measurements.


Todo: fill out these sections

### Navigate data using time line

### Select measurement

### Select estimation method
The choice of estimation methods are directly linked to the `region-estimators` 
(https://github.com/UoMResearchIT/region-estimators) python package, and the 
available estimation classes available within that.

### Filter sites

### Upload your own data locally via CSV file

### Download data and API


# Copyright & Licensing

## Authors
Ann Gledson, Douglas Lowe, David Topping and Caroline Jay

This software has been developed by Ann gledson from the 
[Research IT](https://research-it.manchester.ac.uk/) 
group at the [University of Manchester](https://www.manchester.ac.uk/).

(c) 2020-2021 University of Manchester.
Licensed under the MIT license, see the file LICENSE (or https://www.mit.edu/~amini/LICENSE.md) for details.



  



