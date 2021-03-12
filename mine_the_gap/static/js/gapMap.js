import {LoaderDisplay} from "./loader.js";
import  {svgIcons}  from "./svgIcons.js";
import  {iconShapes} from "./svgIcons.js";
import  {iconColours} from "./svgIcons.js";
var map = null;
var oms = null;

const leafColours = iconColours;
const featureShapes = iconShapes;
const MAX_UNIQUE_FEATURE_LENGTH = featureShapes.length;
const MAX_UNIQUE_LEAF_LENGTH = leafColours.length;

const sitesLayer = new L.LayerGroup();
const regionsLayer = new L.LayerGroup();
var userMeasurementLayers = {};
var layerControl = null;
const accessToken = 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew';
//const attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' +
//                ' contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
//               ', Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
const attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' +
                ' contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
                ', Topology © <a href="https://opentopomap.org">OpenTopoMap</a>';
const mapId = 'mapbox.streets';
//const mapUrlStreet = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
const mapUrlStreet = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const mapUrlTopology = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const defaultInitCenter = ["54.2361", "-4.5481"];
const initZoom = 6;
var xhrSites = null;
var xhrRegions = null;
var xhrUpdate = null;
var regions = {};

export class GapMap {
    constructor(mapDomId, regionsFileUrl, csrfToken, onSensorClickFn, centerLatLng, timestampList) {
        this.svgIcons = new svgIcons();
        this.domId = mapDomId;
        this.accessToken = accessToken;
        this.bounds = null;
        this.regionsFileUrl = regionsFileUrl;
        this.csrftoken = csrfToken;
        this.resultsLoading = false; // Variable used to prevent multiple ajax requests queuing up and confusing UI.
        this.curLoaderRegions = null;
        this.curLoaderSites = null;
        this.curLoaderUpdate = null;
        this.onSensorClickFn = onSensorClickFn;
        this.dataUrl = dataUrl + '/file/';
        this.userUploadedData = null;
        this.timestampList = timestampList
        this.createMap(centerLatLng);
        this.updateMap();

        this.colourShapeMarker = L.Marker.extend({
          options: {
              colour: 'black',
              shape: 'square'
          }
        });
    }

    updateLoader(message){
        if(this.curLoader){this.curLoader.setMessage(message)};
    }

    createMap(centerLatLng){
        // Called once on web app initialisation.

        var streets   = L.tileLayer(mapUrlStreet, {id: mapId, accessToken: accessToken, attribution: attribution});
        var topology = L.tileLayer(mapUrlTopology, {id: mapId, accessToken: accessToken, attribution: attribution});

        var baseMaps = {
            "streets": streets,
            "topology": topology
        };

        var overlayMaps = {
            "Sites": sitesLayer,
            "Regions": regionsLayer
        };

        map = L.map('mapid',{
            layers: [streets, sitesLayer, regionsLayer]
        });
        layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

        oms = new OverlappingMarkerSpiderfier(map, {
            legWeight: 0,
            keepSpiderfied: true,
            nearbyDistance:5,
            circleSpiralSwitchover: 12,
        });
        oms.addListener('spiderfy', function(markers) {
          map.closePopup();
        });


        try {
            var initCenter = jQuery.parseJSON(centerLatLng);

        }catch{
            var initCenter = defaultInitCenter;
        }

        map.setView(initCenter, initZoom);
        map.options.minZoom = 5;
        map.options.maxZoom = 14;
        // bounds must be set after only the first initialisation of map
        this.bounds = map.getBounds();
    }

    addUploadedData(uploadedData) {
        //alert(JSON.stringify(data));
        // Save user uploaded data for displaying
        this.userUploadedData = uploadedData;
        // Display newly loaded data
        this.displayUserUploadedData(true);
    }

    displayUserUploadedData(reset=false){
        if(this.userUploadedData === null){
            return;
        }

        // Get current timestamp
        var timeseries_idx = document.getElementById("timestamp-range").value;
        var timeseries_val = this.timestampList[timeseries_idx].trim();

        /* Example input
        "2016-03-18":{
            "point (-2.2346505 53.4673973)":[
                {"how_feeling":{
                    "value":0,
                    "z_score":null
                    },
                 "taken_meds_today":{
                    "value":0,
                    "z_score":null
                 },
                 "nose":{
                    "value":0,
                    "z_score":null
                 },
                 "eyes":{
                    "value":0,
                    "z_score":null
                 },
                 "breathing":{
                    "value":0,
                    "z_score":null
                 }
                }
               ],
         */
        // Save visible user loaded layers
        var activeOverlays = layerControl.getActiveOverlays();
        //alert('active overlays before: \n' + JSON.stringify(activeOverlays));

        // Clear out any previous user uploaded data layers
        for(var measurement in userMeasurementLayers){
            userMeasurementLayers[measurement].clearLayers();
            layerControl.removeLayer(userMeasurementLayers[measurement]);
        }
        userMeasurementLayers = {};

        var measurementLayer = null;

        // If user data doesn't contain current timestamp, stop processing it here
        // (silently - don't want a pop up every time!!)
        if(!timeseries_val in this.userUploadedData){
            return;
        }

        const shapes = ["square", "triangle", "diamond", "arrowhead-up", "triangle-down", "star",
                            "arrowhead-down", "heart", "hexagon"]

        var svgs = {};
        //alert(JSON.stringify(this.userUploadedData[timeseries_val]));
        for (var geom in this.userUploadedData[timeseries_val]){
            for(var i=0; i < this.userUploadedData[timeseries_val][geom].length; i++) {
                var j = -1;
                //alert(JSON.stringify(this.userUploadedData[timeseries_val][geom][i]));
                for(var measurement in this.userUploadedData[timeseries_val][geom][i]) {
                    j++;
                    //alert(JSON.stringify(this.userUploadedData[timeseries_val][geom][i]));
                    if(measurement in userMeasurementLayers){
                        measurementLayer = userMeasurementLayers[measurement];
                    }else {
                        measurementLayer = new L.LayerGroup();
                        userMeasurementLayers[measurement] = measurementLayer;
                    }

                    var valColor = 'gray';
                    var locValue = 'null';

                    var geomData = this.userUploadedData[timeseries_val][geom][i][measurement];
                    if (geomData['value'] != null) {
                        var percentZ = ((geomData['z_score'] + 3) /6) *100;
                        valColor = this.getGreenToRed(percentZ);
                        locValue = geomData['value'].toString();
                    }
                    var poly = this.getLeafletPolygonFromWkt(geom);
                    var latlng = this.getGeomLatLng(geom, poly);

                    // Get shape for main map icon
                    // Get svg for map
                    var svg = this.svgIcons.getSVGFromName(
                        shapes[j % shapes.length], valColor, 'darkslategray', 0.8, .9);
                    // Get svg shape only, and add to dict for layers control
                    svgs[measurement] = this.svgIcons.getSVGFromName(
                        shapes[j % shapes.length], 'transparent', 'darkslategray', 1, .5);
                    var icon = L.divIcon({
                        html: svg,
                        iconSize: [13, 13],
                        className: 'user-data-icon' // Specify something to get rid of the default class.
                    });
                    var userDataMarker = new this.colourShapeMarker(latlng,
                    {
                        icon: icon,
                        colour: valColor,
                        shape: shapes[j % shapes.length],
                        //title: (geomData['value']).toString()
                    });

                    userDataMarker.bindPopup(this.getExtraUserData(measurement, geomData, valColor));
                    // Add marker
                    measurementLayer.addLayer(userDataMarker);
                    oms.addMarker(userDataMarker);
                }
            }
        }

        // Add the new set of measurement layers to map and layer control
        for(measurement in userMeasurementLayers) {
            // Add to layer control
            layerControl.addOverlay(userMeasurementLayers[measurement],
                this.getLayerControlItemHTML(measurement, svgs[measurement]));
            // If selected in last layer control (last time this function was called), add to map
            if(reset || (this.getLayerControlItemHTML(measurement, svgs[measurement]) in activeOverlays &&
                activeOverlays[this.getLayerControlItemHTML(measurement, svgs[measurement])]  == true)) {
                map.addLayer(userMeasurementLayers[measurement]);
            }
        }
        //alert('active overlays after: \n' + JSON.stringify(layerControl.getActiveOverlays()));
    }

    getExtraUserData(measurement, geomData, valColor){
        var extraData = '<table class="table table-striped">';
        extraData += '<tr><th>Measurement</th><td>' + measurement + '</td></tr>';

        extraData += '<tr><th>Measurement Stats:</th><th colspan="2">(based on all timestamps/regions)</th></tr>';
        extraData += '<tr><th>Value</th><td><button class="score-button">' + geomData.value + '</button></td></tr>';
        extraData += '<tr><th>Z Score</th><td><button class="score-button" style="background-color:' +
            valColor + ';">' +
            (geomData['z_score']).toFixed(2).toString()  + '</button></td></tr>';
        extraData += '<tr><th>Percent Score</th><td><button class="score-button" style="background-color:' +
            this.getGreenToRed(geomData['percent_score']*100) + '">' +
            (geomData['percent_score']*100).toFixed(2).toString()  + '</button></td></tr>';
        extraData += '<tr><th>Mean</th><td>' +
            (geomData['mean']).toFixed(2).toString()  + '</td></tr>';
        extraData += '<tr><th>Standard Deviation</th><td>' +
            (geomData['std_dev']).toFixed(2).toString()  + '</td></tr>';
        extraData += '<tr><th>Min</th><td>' +
            (geomData['min']).toFixed(2).toString()  + '</td></tr>';
        extraData += '<tr><th>Max</th><td>' +
            (geomData['max']).toFixed(2).toString()  + '</td></tr>';

        extraData += '</table>';
        return extraData;
    }

    getLayerControlItemHTML(heading, svg){
        return heading + '   ' + svg;
    }

    getLeafletPolygonFromWkt(strWktGeom){
       /*  'POLYGON (-2.52753,53.80069 -2.48906,53.81088 ... -2.49067,53.82448 -2.50802,53.83755)'
            to
           [    [51.509, -0.08],
                [51.503, -0.06],
                [51.51, -0.047]
            ]
       */
        //alert(strGeom);
        if(strWktGeom.trim().trim('"').startsWith('POLYGON') == true){
            //alert(JSON.stringify(Terraformer.WKT.parse(strWktGeom)));
            return this.switchCoordinatesPoly(Terraformer.WKT.parse(strWktGeom)['coordinates']);
        }else{
            return null;
        }
    }

    getGeomLatLng(strWktGeom, polygon){
        //"point (-0.0830567 51.4221912)"
        var result = null;
        if (strWktGeom.startsWith('POINT') === true) {
            try{
                //alert(JSON.stringify(strWktGeom));
                result = this.switchCoordinates(Terraformer.WKT.parse(strWktGeom)['coordinates']);
            }catch{}
        }else{
            result = this.getCenter(polygon)
        }
        //alert(result);
        return result;
    }

    switchCoordinates(toBeSwitched){
        return [toBeSwitched[1], toBeSwitched[0]];
    }

    switchCoordinatesPoly(toBeSwitchedPoly){
        var result = toBeSwitchedPoly[0].map (function (a){ return [a[1], a[0]] });
        //alert(JSON.stringify(result));
        return [result];
    }

    getCenter(polygonArr)
    {
        var arrCoords = polygonArr.flat();
        var x = arrCoords.map (function (a){ return a[0] });
        var y = arrCoords.map (function (a){ return a[1] });
        var minX = Math.min.apply (null, x);
        var maxX = Math.max.apply (null, x);
        var minY = Math.min.apply (null, y);
        var maxY = Math.max.apply (null, y);

        return [(maxX + minX) / 2, (maxY + minY) / 2];
    }

    updateTimeseries(jsonParams, method, timeseries_val, measurement){
        //Update user uploaded data
        this.displayUserUploadedData();
        this.updateTimeseriesRegions(jsonParams, method, timeseries_val, measurement);
        this.updateTimeseriesSites(jsonParams, timeseries_val, measurement);
    }

    updateTimeseriesRegions(jsonParams, method, timeseries_val, measurement){
        var dataUrl = dataUrlRegions + '/' + method + '/' + measurement + '/' + timeseries_val + '/';

        // Clear region data
        for (var key in regions){
            regions[key].setStyle({
                'fillColor': 'transparent',
                'fillOpacity': 0.2,
              });
        }

        var self = this;
        xhrRegions = $.ajax({
            url: dataUrl,
            data: JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": this.csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 100000,
            beforeSend: function () {
                // Stop previous loading
                if(self.curLoaderRegions){self.curLoaderRegions.stopLoader('loader-outer-regions')};
                if(xhrRegions){xhrRegions.abort()};
                // we are now awaiting browse results to load
                self.resultsLoading = true;
                // Set up loader display
                self.curLoaderRegions = new LoaderDisplay('loader-outer-regions',
                    '<p>Collecting region data...</p>');
            },
            success: function (data) {
                //alert(JSON.stringify(data));
                self.updateTimeseriesDisplayRegions(data);
            },
            error: function (xhr, status, error) {
                if (xhr.statusText !== 'abort') {
                    alert("An error occurred fetching regions: "
                        + "url: " + dataUrl + '; '
                        + "message: " + error + "; "
                        + "status: " + xhr.status + "; "
                        + "status-text: " + xhr.statusText + "; "
                        + "error message: " + JSON.stringify(xhr));
                }
            },
            complete: function (request, status) {
                // Clear Loader
                self.curLoaderRegions.stopLoader('loader-outer-regions');
                self.resultsLoading = false;
            }
        });
    }

    updateTimeseriesSites(jsonParams, timeseries_val, measurement){
        var dataUrl = dataUrlSites + '/' + measurement + '/' + timeseries_val + '/';

        // Clear sites
        sitesLayer.clearLayers();

        var self = this;
        xhrSites = $.ajax({
            url: dataUrl,
            data:JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": this.csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 100000,
            beforeSend: function () {
                // Stop previous loading
                if(self.curLoaderSites){self.curLoaderSites.stopLoader('loader-outer')};
                if(xhrSites){xhrSites.abort()};
                // we are now awaiting browse results to load
                self.resultsLoading = true;
                // Set up loader display
                self.curLoaderSites =
                    new LoaderDisplay('loader-outer', '<p>Collecting site data...</p>');
            },
            success: function (data) {
                //alert(JSON.stringify(data));
                self.updateTimeseriesDisplaySites(data, measurement);
            },
            error: function (xhr, status, error) {
                if (xhr.statusText !== 'abort') {
                    alert("An error occurred loading sites: "
                        + "url: " + dataUrl + '; '
                        + "message: " + error + "; "
                        + "status: " + xhr.status + "; "
                        + "status-text: " + xhr.statusText + "; "
                        + "error message: " + JSON.stringify(xhr));
                }
            },
            complete: function (request, status) {
                // Clear Loader
                self.curLoaderSites.stopLoader('loader-outer');
                self.resultsLoading = false;
            }
        });
    }

    updateTimeseriesDisplayRegions(data){
        var estimatedData = data['estimated_data'];

        /*  Sample data
        [
            {   "region_extra_data":"['St Albans postcode area', '249911', 'SG/WD/EN/LU/HP/N /HA/NW/UB', 'England']",
                "region_id":"AL",
                "value":74.5,
                "geom":
                    [[[[-0.25616,51.71952],[-0.26278,51.71111],[-0.30966,51.71255],[-0.34563,51.69573],
                    [-0.36084,51.69769],[-0.36764,51.68499],[-0.37461,51.69197],[-0.36263,51.69805],
                    [-0.38517,51.70467],[-0.38338,51.71398],[-0.40342,51.73366],[-0.40146,51.74171],
                    [-0.41004,51.74744],[-0.41523,51.77464],[-0.5038,51.82062],[-0.46981,51.8514],
                    [-0.44243,51.84925],[-0.42758,51.83386],[-0.37461,51.84013],[-0.35207,51.83529],
                    [-0.33364,51.84818],[-0.31503,51.83762],[-0.28103,51.83511],[-0.27405,51.85014],
                    [-0.23469,51.83333],[-0.22324,51.85981],[-0.18405,51.84979],[-0.13664,51.84138],
                    [-0.15292,51.80112],[-0.16115,51.7834],[-0.14487,51.7766],[-0.13842,51.75835],
                    [-0.15059,51.7274],[-0.1633,51.72346],[-0.15882,51.7129],[-0.19962,51.71129],
                    [-0.2533,51.7197],[-0.25616,51.71952]]]],
                 "extra_data":"{'rings':'1'}",
                 "timestamp":"2017-08-22",
                 "method_name":"file",
                 "percent_score": 0.33557046979865773,
                 'z_score': 0.8,
                 'min': 2,
                 'max': 22,
                 'mean': 12,
                 'std_dev': 3.5
             }
          ]
        */

        // Update regions to show values
        for (var i=0; i<estimatedData.length; i++){
            var region = estimatedData[i];
            /*if (i==0){
                alert(JSON.stringify(region));
            }*/

            var layer = regions[region.region_id];
            if (layer == null){
                //alert(region.region_id);
                //alert(JSON.stringify(region));
                continue;
            }

            var valColor = 'gray'
            if (region.value == null){
                layer.setStyle({
                            'fillColor': 'gray',
                            'fillOpacity': 0.7,
                            'weight': '1'
                          });
                var regionValue = 'none';

            }else {
                valColor = this.getGreenToRed(((region.z_score+3) /6) * 100).toString();
                layer.setStyle({
                    'fillColor': valColor,
                    'fillOpacity': 0.2,
                    'weight': '1'
                });
                var regionValue = region.value.toString();
            }
            /*  Sample input
            [
            {   "region_extra_data":"['St Albans postcode area', '249911', 'SG/WD/EN/LU/HP/N /HA/NW/UB', 'England']",
                "region_id":"AL",
                "value":74.5,
                "geom":
                    [[[[-0.25616,51.71952],[-0.26278,51.71111],[-0.30966,51.71255],[-0.34563,51.69573],
                    [-0.36084,51.69769],[-0.36764,51.68499],[-0.37461,51.69197],[-0.36263,51.69805],
                    [-0.38517,51.70467],[-0.38338,51.71398],[-0.40342,51.73366],[-0.40146,51.74171],
                    [-0.41004,51.74744],[-0.41523,51.77464],[-0.5038,51.82062],[-0.46981,51.8514],
                    [-0.44243,51.84925],[-0.42758,51.83386],[-0.37461,51.84013],[-0.35207,51.83529],
                    [-0.33364,51.84818],[-0.31503,51.83762],[-0.28103,51.83511],[-0.27405,51.85014],
                    [-0.23469,51.83333],[-0.22324,51.85981],[-0.18405,51.84979],[-0.13664,51.84138],
                    [-0.15292,51.80112],[-0.16115,51.7834],[-0.14487,51.7766],[-0.13842,51.75835],
                    [-0.15059,51.7274],[-0.1633,51.72346],[-0.15882,51.7129],[-0.19962,51.71129],
                    [-0.2533,51.7197],[-0.25616,51.71952]]]],
                 "extra_data":"{'rings':'1'}",
                 "timestamp":"2017-08-22 00:00:00+00",
                 "percent_score": 0.33557046979865773,
                 'z_score': 0.8,
                 'min': 2,
                 'max': 22,
                 'mean': 12,
                 'std_dev': 3.5
             }
          ]
        */
            var extraData = '<table class="table table-striped">';
            extraData += '<tr><th>Region ID</th><td>' + region.region_id + '</td></tr>';
            extraData += '<tr><th>Timestamp</th><td>' + region.timestamp.toString() + '</td></tr>';
            for (var key in region['extra_data']){
                extraData += '<tr><th>' + key + '</th><td>' + region['extra_data'][key] + '</td></tr>';
            };
            for (var key in region['region_extra_data']){
                extraData += '<tr><th>' + key + '</th><td>' + region['region_extra_data'][key] + '</td></tr>';
            };
            extraData += '<tr><th>Measurement Stats:</th><th colspan="2">(based on all timestamps/regions)</th></tr>';
            extraData += '<tr><th>Value</th><td><button class="score-button">' + region.value + '</button></td></tr>';
            extraData += '<tr><th>Z Score</th><td><button class="score-button"  style="background-color:' +
                valColor + ';">' +  (region.z_score*1).toString()  + '</button></td></tr>';
            extraData += '<tr><th>Percentage Score</th><td><button class="score-button"  style="background-color:' +
                this.getGreenToRed(region.percent_score*100) + ';">' +  (region.percent_score*100).toFixed(2).toString()  +
                '</button></td></tr>';
            extraData += '<tr><th>Mean</th><td>' +  (region.percent_score*100).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Standard Dev</th><td>' +  (region.std_dev).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Min value</th><td>' +  (region.min).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Max value</th><td>' +  (region.max).toFixed(2).toString()  + '</td></tr>';

            extraData += '</table>';
            layer.bindPopup(extraData);
        }
    }

    updateTimeseriesDisplaySites(data, measurement){
        var actualData = data['actual_data'];

        /* Sample actualData
        [
            {   "extra_data":"{"region":"AB"}",
                "value":66,
                "timestamp":"2017-01-01 00:00:00+00",
                "z_score": 0.436241610738255,
                "percent_score": 0.33557046979865773,
                 'min': 2,
                 'max': 22,
                 'mean': 12,
                 'std_dev': 3.5
                "site_id":757,
                "geom":[-2.1031362,57.1453481],
                "name": 'Aberdeen Union Street Roadside',
                "ignore": False,
            }
          ]
        */

        for (var i=0; i<actualData.length; i++){
            var loc = actualData[i];
            /*if(i==0) {
                alert(JSON.stringify(loc, null));
            };*/

            var latlng = [loc.geom[1], loc.geom[0]];
            var valColor = 'grey';
            var fontColor = 'black'
            var locValue = 'null';

            if (loc['value'] != null){
                valColor = this.getGreenToRed(((loc.z_score + 3) / 6) *100).toString();
                locValue = loc.value.toString();
            }
            if (loc['ignore']) {
                valColor = 'lightgrey';
                fontColor = 'grey'
            }

            var bespokeOptions = {
                // Bespoke for gapMap
                measurement: measurement,
                site_id: loc.site_id,
                regions: loc.regions,
                name: loc.name
            }

            var siteMarker = new L.Marker.SVGMarker(latlng,
                    {   iconOptions: {
                            color: valColor,
                            fontColor: fontColor,
                            iconSize: [30,40],
                            circleText: locValue,
                            circleRatio: 0.8,
                            fontSize:8,

                            // Bespoke for gapMap
                            bespokeOptions: bespokeOptions

                        },
                    }
                );

            // Add marker

            var extraData = '<table class="table table-striped">';
            extraData += '<tr><th>Name</th><td>' + loc.name + '</td></tr>';
            extraData += '<tr><th>ID</th><td>' + loc.site_id + '</td></tr>';
            extraData += '<tr><th>Location</th><td>' + loc.geom[0].toFixed(2).toString() +
                ', ' + loc.geom[1].toFixed(2).toString() +  '</td></tr>';
            extraData += '<tr><th>Timestamp</th><td>' + loc.timestamp.toString() + '</td></tr>';
            for (var key in loc['extra_data']){
                if(loc['extra_data'][key] != null) {
                    extraData += '<tr><th>' + key + '</th><td>' + loc['extra_data'][key] + '</td></tr>';
                }
            };
            for (var key in loc['site_extra_data']){
                if(loc['site_extra_data'][key] != null && loc['site_extra_data'][key] != '') {
                    extraData += '<tr><th>' + key + '</th><td>' + loc['site_extra_data'][key] + '</td></tr>';
                }
            };

            extraData += '<tr><th>Measurement Stats:</th><th colspan="2">(based on all timestamps/regions)</th></tr>';
            extraData += '<tr><th>Value</th><td><button class="score-button">' + loc.value + '</button></td></tr>';
            extraData += '<tr><th>Z Score</th><td><button class="score-button" style="background-color:' +
                valColor + ';">' +
                (loc.z_score*1).toString()  + '</button></td></tr>';
            extraData += '<tr><th>Percentage Score</th><td><button class="score-button" style="background-color:' +
                this.getGreenToRed(loc.percent_score*100) + ';">' +
                (loc.percent_score*100).toFixed(2).toString()  + '</button></td></tr>';
            extraData += '<tr><th>Mean</th><td>' +  (loc.mean).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Standard Dev</th><td>' +  (loc.std_dev).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Min value</th><td>' +  (loc.min).toFixed(2).toString()  + '</td></tr>';
            extraData += '<tr><th>Max value</th><td>' +  (loc.max).toFixed(2).toString()  + '</td></tr>';

            extraData += '</table>';

            var popButton = document.createElement('input');
            popButton.type = "button";
            popButton.name = 'get-timeseries';
            popButton.className = 'get-timeseries';
            popButton.value = 'Get timeseries';
            popButton.setAttribute("onclick",
                "showTimelineComparisons('"+measurement+"','" +loc.site_id + "','" + loc.regions + "','" + loc.name + "')");

            siteMarker.bindPopup(extraData + popButton.outerHTML);
            sitesLayer.addLayer(siteMarker);
        }
    }

    updateMap(urlRegion=this.regionsFileUrl, mapType='street-map', zoomLevel=initZoom,
                        mapCenter=defaultInitCenter){
        // Initialise map
        map.setView(mapCenter, zoomLevel);

        function locateBounds () {
         // geolocate
        }
        (new L.Control.ResetView(this.bounds)).addTo(map);

        // Add Regions to map
        regionsLayer.clearLayers();
        var self = this;
        xhrUpdate = $.ajax({
            url: urlRegion,
            dataType: 'json',
            async: false,
            beforeSend: function () {
                if(self.curLoaderUpdate){self.curLoaderUpdate.stopLoader('loader-outer');}
                if(xhrUpdate){xhrUpdate.abort()};
                // Set up loader display
                self.curLoaderUpdate =
                    new LoaderDisplay('loader-outer','<p>Setting up map and region data...</p>');
            },
            success: function(data) {
                // Add GeoJSON layer
                var geoLayer = L.geoJson(
                    data,
                    {   onEachFeature: function (feature, layer) {
                            regions[feature.properties.popup_content.region_id] = layer;
                            layer.setStyle({
                                'fillColor': 'transparent',
                                'weight': '1'
                              });
                            var extraData = '<table class="table table-striped">';
                            for (var key in feature.properties.popup_content.extra_data){
                                extraData += '<tr><th>' + key  + '</th><td>' + feature.properties.popup_content.extra_data[key] + '</td></tr>';
                            };
                            extraData += '</table>';
                            layer.on('mouseover', function () {
                                  this.setStyle({
                                    //'fillColor': '#ff3b24'
                                      'weight': '2'
                                  });
                                  /*$('#region-data').html(
                                      '<p><b>Region: </b>' + feature.properties.popup_content.region_id + '</p>' +
                                      extraData
                                  );*/
                            });
                            layer.on('mouseout', function () {
                              this.setStyle({
                                //'fillColor': 'transparent'
                                'weight': '1'
                              });
                              //$('#region-data').html(getRegionDefaultHTMLFunc())
                            });
                        }
                    },
                );
                regionsLayer.addLayer(geoLayer);
            },
            error: function (xhr, status, error) {
                if (xhr.statusText !== 'abort') {
                    alert("There was an problem fetching the region meta-data: "
                        + "url: " + urlRegion + '; '
                        + "message: " + error + "; "
                        + "status: " + xhr.status + "; "
                        + "status-text: " + xhr.statusText + "; "
                        + "error message: " + JSON.stringify(xhr));
                }
            },
            complete: function (request, status) {
                // Clear Loader
                self.curLoaderUpdate.stopLoader('loader-outer');
            }
        });
    };

    getGreenToRed(percent){
        var g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
        var r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
        return 'rgb('+r+','+g+',0)';
    }
}

// Add method to layer control class
L.Control.Layers.include({
  getActiveOverlays: function() {
    // create hash to hold all layers
    var control, layers;
    layers = {};
    control = this;

    // loop thru all layers in control
    control._layers.forEach(function(obj) {
      var layerName;

      // check if layer is an overlay
      if (obj.overlay) {
        // get name of overlay
        layerName = obj.name;
        // store whether it's present on the map or not
        return layers[layerName] = control._map.hasLayer(obj.layer);
      }
    });

    return layers;
  }
});


