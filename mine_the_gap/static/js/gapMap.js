import {LoaderDisplay} from "./loader.js";

var map = null;
const sensorsLayer = new L.LayerGroup();
const regionsLayer = new L.LayerGroup();
const accessToken = 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew';
const attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' +
                ' contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
                ', Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
const mapId = 'mapbox.streets';
const mapUrlStreet = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
const mapUrlTopology = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const defaultInitCenter = ["54.2361", "-4.5481"];
const initZoom = 6;
var curLoader;
let resultsLoading = false;  // Variable used to prevent multiple ajax requests queuing up and confusing UI.
let xhr = null;
var regions = {};


export class GapMap {
    constructor(mapDomId, regionsFileUrl, dataUrl, csrfToken) {
        this.domId = mapDomId;
        this.accessToken = accessToken;
        this.bounds = null;
        this.regionsFileUrl = regionsFileUrl;
        this.curDataUrl = dataUrl;
        this.csrftoken = csrfToken;
    }

    createMap(centerLatLng){
        var streets   = L.tileLayer(mapUrlStreet, {id: mapId, accessToken: accessToken, attribution: attribution});
        var topology = L.tileLayer(mapUrlTopology, {id: mapId, accessToken: accessToken, attribution: attribution});

        var baseMaps = {
            "streets": streets,
            "topology": topology
        };

        map = L.map('mapid',{
            layers: [streets]
        });
        L.control.layers(baseMaps).addTo(map);


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
        var timeseries_val = timestampList[timeseries_idx].trim();
        var dataUrl = this.curDataUrl + measurement + '/' + timeseries_val + '/';

        // 1. Update sensors to show values

        // Clear sensor and region data
        sensorsLayer.clearLayers();
        for (var key in regions){
            regions[key].setStyle({
                'fillColor': 'transparent',
                'fillOpacity': 0.2,
              });
        };


        xhr = $.ajax({
            url: dataUrl,
            data:JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": this.csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 100000,
            beforeSend: function () {
                // we are now awaiting browse results to load
                resultsLoading = true;
                // Set up loader display
                curLoader = new LoaderDisplay('loader-outer', '<p>Collecting sensor data...</p>', 'fetch-data-loader');
            },
            success: function (data) {
                var actualData = data['actual_data'];
                var estimatedData = data['estimated_data'];

                /*[
                    {   "extra_data":"{"region":"AB"}",
                        "value":66,
                        "timestamp":"2017-01-01 00:00:00+00",
                        "percent_score":0.436241610738255,
                        "sensor_id":757,
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
                        valColor = getGreenToRed(loc.percent_score * 100).toString();
                        locValue = loc.value.toString();
                    };
                    if (loc['ignore']) {
                        valColor = 'blue';
                    };


                    var sensorMarker = new L.Marker.SVGMarker(latlng,
                            {   iconOptions: {
                                    color: valColor,
                                    iconSize: [30,40],
                                    circleText: locValue,
                                    circleRatio: 0.8,
                                    fontSize:8
                                },
                            }
                        );

                    // Add marker

                    var extraData = '<table class="table table-striped">';
                    extraData += '<tr><th>Name</th><td>' + loc.name + '</td></tr>';
                    extraData += '<tr><th>ID</th><td>' + loc.sensor_id + '</td></tr>';
                    extraData += '<tr><th>Location</th><td>' + loc.geom + '</td></tr>';
                    extraData += '<tr><th>Timestamp</th><td>' + loc.timestamp.toString() + '</td></tr>';
                    extraData += '<tr><th>Value</th><td>' + loc.value + '</td></tr>';
                    extraData += '<tr><th>Percentage Score</th><td>' +  (loc.percent_score*100).toFixed(2).toString()  + '</td></tr>';
                    for (var key in loc['extra_data']){
                        if(loc['extra_data'][key] != null) {
                            extraData += '<tr><th>' + key + '</th><td>' + loc['extra_data'][key] + '</td></tr>';
                        }
                    };
                    for (var key in loc['sensor_extra_data']){
                        if(loc['sensor_extra_data'][key] != null && loc['sensor_extra_data'][key] != '') {
                            extraData += '<tr><th>' + key + '</th><td>' + loc['sensor_extra_data'][key] + '</td></tr>';
                        }
                    };
                    extraData += '</table>';

                    var button = document.createElement('button');
                    button.name = 'get-timeseries';
                    button.innerHTML = 'Get timeseries';
                    button.setAttribute("onclick", "sensorClick('"+measurement+"','" +loc.sensor_id + "','" + loc.regions + "','" + loc.name + "')");
                    sensorMarker.bindPopup(extraData + button.outerHTML);

                    sensorsLayer.addLayer(sensorMarker);
                };
                sensorsLayer.addTo(map);


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
                        var regionValue = 'null';

                    }else {
                        var valColor = getGreenToRed(region.percent_score * 100).toString();
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
                curLoader.stopLoader('loader-outer');
                resultsLoading = false;
            }
        });

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
        xhr = $.ajax({
            url: urlRegion,
            dataType: 'json',
            async: false,
            beforeSend: function () {
                // Set up loader display
                curLoader = new LoaderDisplay('loader-outer', '<p>Setting up map and region data...</p>');
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
                regionsLayer.addTo(map);
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
                curLoader.stopLoader('loader-outer');
            }
        });
    };
}

function sensorClick(measurement, sensorId, regionId, sensorName) {
    var estimationMethod = $("input[name='estimation-method']:checked").val();

    var listItem = document.createElement('a');
    listItem.className = "list-group-item list-group-item-action flex-column align-items-start sensor-chart";
    listItem.href = '#';
    var listItemDiv = document.createElement('div');
    listItemDiv.className = 'd-flex w-100 justify-content-between';
    var canvasItem = document.createElement('canvas');
    canvasItem.id = "sensor-chart";
    var newChartTitle = document.createElement('div');

    newChartTitle.innerHTML = '<p><b>Sensor Name: ' + sensorName + '</b><br>' +
        'Measurment: ' + measurement + '<br>' +
        'Estimation Method: ' + estimationMethod + '</p>';

    listItemDiv.appendChild(newChartTitle);
    listItemDiv.appendChild(canvasItem);
    listItem.appendChild(listItemDiv);
    var list = document.getElementById('sensor-charts');
    list.insertBefore(listItem, list.firstChild);

    var ctx = canvasItem.getContext('2d');
    var listChart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',
        // The data for our dataset
        data: {
            labels: timestampList,
            datasets: [],
        },
        // Configuration options go here
        options: {}
    });


    var modal = document.createElement('div');
    modal.className = 'modal';
    var modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    var span = document.createElement('span');
    span.className = "close";
    span.innerHTML = '&times';

    modalContent.appendChild(span);

    var modalCanvas = canvasItem.cloneNode(true);
    modalCanvas.id = 'modal-canvas';

    var ctxModal = modalCanvas.getContext('2d');
    var modalChart = new Chart(ctxModal, {
        // The type of chart we want to create
        type: 'line',
        // The data for our dataset
        data: {
            labels: timestampList,
            datasets: [],
        },
        // Configuration options go here
        options: {}
    });

    modalContent.appendChild(modalCanvas);
    modal.appendChild(modalContent);
    list.appendChild(modal);

    // When the user clicks the button, open the modal
    newChartTitle.onclick = function () {
        modal.style.display = "block";
    };

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    getActualTimeseries(measurement, sensorId, listChart, modalChart);
    getEstimatedTimeseries(measurement, estimationMethod, regionId, sensorId, listChart, modalChart);
}

function getGreenToRed(percent){
    var g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
    var r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
    return 'rgb('+r+','+g+',0)';
}

function getActualTimeseries(measurement, sensorId, listChart, modalChart){
    //url: sensor_timeseries/<slug:measurement>/<int:sensor_id>

    var urlActual = sensorTimeseriesUrl + '/' + measurement + '/' + sensorId + '/';
    //alert(actualUrl);
    xhr = $.ajax({
        url: urlActual,
        headers: {"X-CSRFToken": this.csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 200000,
        async: true,
        success: function (data) {
            var values = [];
            for (var timestampIdx=0; timestampIdx<timestampList.length; timestampIdx++){
                values.push(getTimestampValue(data, timestampList[timestampIdx]));
            };
            listChart.data.datasets.push(
                    {
                        label: 'Sensor values',
                        backgroundColor: 'green',
                        borderColor: 'green',
                        fill:false,
                        data: values
                    }
            );
            listChart.update();
            modalChart.data.datasets.push(
                    {
                        label: 'Sensor values',
                        backgroundColor: 'green',
                        borderColor: 'green',
                        fill:false,
                        data: values
                    }
            );
            modalChart.update();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem obtaining the sensor timeseries data: "
                    + "url: " + urlActual + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        }
    });
}

function getEstimatedTimeseries(measurement, method, regionId, ignoreSensorId, listChart, modalChart){
    //url: estimated_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/<int:ignore_sensor_id>/
    var urlEstimates = estimatedTimeseriesUrl + '/' + method + '/' + measurement + '/' + regionId + '/' + ignoreSensorId + '/';

    //alert(url_estimates);
    xhr = $.ajax({
        url: urlEstimates,
        headers: {"X-CSRFToken": this.csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 300000,
        async: true,
        success: function (data) {
            var estValues = [];
            for (var timestampIdx=0; timestampIdx<timestampList.length; timestampIdx++){
                estValues.push(getTimestampValue(data, timestampList[timestampIdx]));
            };
            listChart.data.datasets.push(
                    {
                        label: 'Estimated values',
                        backgroundColor: 'red',
                        borderColor: 'red',
                        fill:false,
                        data: estValues
                    }
            );
            listChart.update();
            modalChart.data.datasets.push(
                    {
                        label: 'Estimated values',
                        backgroundColor: 'red',
                        borderColor: 'red',
                        fill:false,
                        data: estValues
                    }
            );
            modalChart.update();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem obtaining the estimated timeseries data: "
                    + "url: " + urlEstimates + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        }
    });
}

