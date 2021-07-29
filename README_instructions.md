The sections below are:

- [User instructions](#user-instructions)
  - [Example screenshots](#example-screenshots)
  - [General users](#general-users)
  - [Admin users](#admin-users)
<!-- toc -->

# User instructions

## Example screenshots

### Example with daily UK AQ data
(currently running on our web app deployment: see http://minethegaps.manchester.ac.uk/)
![alt text](images/mine-the-gaps_general_screenshot.png)

### Example with yearly Arizona Chloride PM2.5 LC data
![Arizona_Chloride](images/mine-the-gaps_screenshot_US_Arizona_Chloride.png)

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
*Note that if you are using the web app with the sample data loaded, only one measurement is currently 
available.*

### Select estimation method
The choice of estimation methods are directly linked to the `region-estimators` 
(https://github.com/UoMResearchIT/region-estimators) python package, and the 
available estimation classes within that.

If the `pre-loaded` option is selected, this will use data in the estimated, timestamped data that was loaded
by the admin user. (If the example files were used, this data will contain all zeros.)

For other options (e.g. `concentric-regions' or `distance-simple`) see the 
https://github.com/UoMResearchIT/region-estimators repo for details.

*Note that some estimation methods may take a while to run, particularly when running a time-series graphs.*

### Run a time-series graph 
Time-series graphs can be generated for a sensor, that compares the actual sensor measurement readings with estimated
sensor values, calculated if that sensor did not exist. 

Click on a sensor to view sensor metadata and click on the `Get timeseries` button. 

*Note that some estimation methods might take longer to run than others.*

*Note also that if using `pre-loaded` estimation method, even if you have loaded your own non-zero estimated data file, 
this comparison won't fully make sense as the estimations are not calculated at runtime, so the
`Estimated values` will have been calculated with that sensor's data being present.*

### Filter sites
Click on the `Filter sites by...` button to filter sites by selecting or omitting values. 
*Note that the fields that can be used for filtering are the optional fields loaded in from the sensors 
metadata file.* 

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
repository owners' project. In addition, the top section of the `Download data` pop-up box points to project related
data links. 

Currently, these can only be changed by accessing HTML files directly. Replace the HTML in the files held in the 
`/mine_the_gap/templates/flexible_content/` folder with your desired content.

If you used the the Docker container to install this application, you can access the web app's source code via
the container's shell. Run:\
`docker exec -it geo_sensor_gaps_web_1 /bin/bash`\
*Note: `geo_sensor_gaps_web_1` should match the `NAME` of the container, listed when you get the list
of all running containers (see above).*



  



