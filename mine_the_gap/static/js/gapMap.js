import {LoaderDisplay} from "./loader.js";

var map = null;
const sitesLayer = new L.LayerGroup();
const regionsLayer = new L.LayerGroup();
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
var xhr = null;
var regions = {};

export class GapMap {
    constructor(mapDomId, regionsFileUrl, csrfToken, onSensorClickFn) {
        this.domId = mapDomId;
        this.accessToken = accessToken;
        this.bounds = null;
        this.regionsFileUrl = regionsFileUrl;
        this.csrftoken = csrfToken;
        this.resultsLoading = false; // Variable used to prevent multiple ajax requests queuing up and confusing UI.
        this.curLoader = null;
        this.onSensorClickFn = onSensorClickFn;
        this.dataUrl = dataUrl + '/file/';
        this.createMap(centerLatLng);
        this.updateMap();
    }

    createMap(centerLatLng){
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
        L.control.layers(baseMaps, overlayMaps).addTo(map);


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

    updateTimeseries(jsonParams, timeseries_idx=document.getElementById("timestamp-range").value,
                               measurement=$("input[name='measurement']:checked").val()){
        if(timestampList.length < 1 || timestampList[0] == null || timestampList[0] == ''){
            return;
        }
        var timeseries_val = timestampList[timeseries_idx].trim();
        var dataUrl = this.dataUrl + measurement + '/' + timeseries_val + '/';

        // 1. Update sites to show values

        // Clear site and region data
        sitesLayer.clearLayers();
        for (var key in regions){
            regions[key].setStyle({
                'fillColor': 'transparent',
                'fillOpacity': 0.2,
              });
        }

        //alert(dataUrl);

        var self = this;
        xhr = $.ajax({
            url: dataUrl,
            data:JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": this.csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 100000,
            beforeSend: function () {
                // Stop previous loading
                self.curLoader.stopLoader('loader-outer');
                xhr.abort();
                // we are now awaiting browse results to load
                self.resultsLoading = true;
                // Set up loader display
                self.curLoader = new LoaderDisplay('loader-outer', '<p>Collecting site data...</p>',
                    'fetch-data-loader');
            },
            success: function (data) {
                //alert(JSON.stringify(data));
                self.updateTimeseriesDisplay(data, measurement);
            },
            error: function (xhr, status, error) {
                if (xhr.statusText !== 'abort') {
                    alert("An error occurred: "
                        + "url: " + dataUrl + '; '
                        + "message: " + error + "; "
                        + "status: " + xhr.status + "; "
                        + "status-text: " + xhr.statusText + "; "
                        + "error message: " + JSON.stringify(xhr));
                }
            },
            complete: function (request, status) {
                // Clear Loader
                self.curLoader.stopLoader('loader-outer');
                self.resultsLoading = false;
            }
        });

    }

    updateTimeseriesDisplay(data, measurement){
        var actualData = data['actual_data'];
        var estimatedData = data['estimated_data'];

        /*[
            {   "extra_data":"{"region":"AB"}",
                "value":66,
                "timestamp":"2017-01-01 00:00:00+00",
                "percent_score":0.436241610738255,
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
                alert(JSON.stringify(loc, null, 1));
            };*/

            var latlng = [loc.geom[1], loc.geom[0]];
            var valColor = 'grey';
            var locValue = 'null';

            if (loc['value'] != null){
                valColor = this.getGreenToRed(loc.percent_score * 100).toString();
                locValue = loc.value.toString();
            }
            if (loc['ignore']) {
                valColor = 'blue';
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
            extraData += '<tr><th>Location</th><td>' + loc.geom + '</td></tr>';
            extraData += '<tr><th>Timestamp</th><td>' + loc.timestamp.toString() + '</td></tr>';
            extraData += '<tr><th>Value</th><td>' + loc.value + '</td></tr>';
            extraData += '<tr><th>Percentage Score</th><td>' +  (loc.percent_score*100).toFixed(2).toString()  + '</td></tr>';
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

        };
        //sitesLayer.addTo(map);

        /*[
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
                 "percent_score": 0.33557046979865773
             }
          ]
        */

        // Clear each region's layer info
        for (var key in regions) {
            regions[key].bindTooltip('None',
                {permanent: false, direction: "center", opacity: 1.8, minWidth: 200, maxWidth: 200}
            )

        }

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

            if (region.value == null){
                layer.setStyle({
                            'fillColor': 'grey',
                            'fillOpacity': 0.7,
                            'weight': '1'
                          });
                var regionValue = 'none';

            }else {
                var valColor = this.getGreenToRed(region.percent_score * 100).toString();
                layer.setStyle({
                    'fillColor': valColor,
                    'fillOpacity': 0.2,
                    'weight': '1'
                });
                var regionValue = region.value.toString();
            }
            var extraData = '';
            for (var key in region['extra_data']){
                extraData += '<br>' + key + ': ' + region['extra_data'][key];
            };
            layer.bindTooltip(regionValue +
                extraData,
                {permanent: false, direction: "center", opacity: 1.8, minWidth: 200, maxWidth: 200}
            )
        }
    }

    updateMap(urlRegion=this.regionsFileUrl, mapType='street-map', zoomLevel=initZoom,
                        mapCenter=defaultInitCenter){

        map.setView(mapCenter, zoomLevel);

        /*
                Initialise map

         */

        function locateBounds () {
         // geolocate
        }
        (new L.Control.ResetView(this.bounds)).addTo(map);


         /*
                Add Regions to map

         */

        regionsLayer.clearLayers();
        var self = this;
        xhr = $.ajax({
            url: urlRegion,
            dataType: 'json',
            async: false,
            beforeSend: function () {
                // Set up loader display
                self.curLoader = new LoaderDisplay('loader-outer', '<p>Setting up map and region data...</p>');
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
                                      'weight': '5'
                                  });
                                  $('#region-data').html(
                                      '<p><b>Region: </b>' + feature.properties.popup_content.region_id + '</p>' +
                                      extraData
                                  );
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
                //regionsLayer.addTo(map);
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
                self.curLoader.stopLoader('loader-outer');
            }
        });
    };

    getGreenToRed(percent){
        var g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
        var r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
        return 'rgb('+r+','+g+',0)';
    }
}


