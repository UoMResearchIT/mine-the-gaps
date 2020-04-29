$(document).ready(function(){

    // Initialise layer lists for later use
    var sensorsLayer = new L.LayerGroup();
    var regionsLayer = new L.LayerGroup();
    var regions = {};

    // Make the timestamp slider draggable:
    dragElement(document.getElementById("map-slider"));

    $("#file-upload-form").on("submit", function(){
        if(confirm('Do you really want to replace these files?')){
            var loaderOuterDiv = document.getElementById('loader-outer');
            // Set up loader display
            var loaderDiv = document.createElement('div');
            loaderDiv.id = 'loader';
            loaderOuterDiv.appendChild(loaderDiv);
            drawLoader(loaderDiv, '<p>Uploading data...</p>');
            return true;
        }else{
            return false;
        }
    });

    $("div#select-files").hide();
    // Upload files toggle button
    $("button#btn-select-files").click(function(){
        $("div#select-files").toggle('slow');
    });

    var curDataUrl = dataUrl + '/file/';

    $("#estimation-method-label").html('<em>' + $("input[name='estimation-method']:checked").val() + '</em>');
    $("#estimation-method input").change(function() {
        $("#estimation-method-label").html('<em>' + $("input[name='estimation-method']:checked").val() + '</em>');

        // The following (commented out) is from when we still had choice of region types
        /*if ($("input[name='region-method']:checked").val() === 'file') {
            curDataUrl = dataUrl + '/' + this.value + '/';
        }else{
            curDataUrl = dataUrlDynamicRegions + '/' + $("input[name='region-method']:checked").val() + '/' + this.value + '/';
        }*/
        curDataUrl = dataUrl + '/' + this.value + '/';
        update_timeseries_map()
    });

    $("#measurement-names-label").html('<em>' + $("input[name='measurement']:checked").val() + '</em>');
    $("#measurement-names input").change(function() {
        $("#measurement-names-label").html('<em>' + $("input[name='measurement']:checked").val() + '</em>');
        update_timeseries_map();
    });

    $("#map-overlays-label").html('<em>' + $("input[name='map-type']:checked").val() + '</em>');
    $("#map-overlays input").change(function() {
        $("#map-overlays-label").html('<em>' + $("input[name='map-type']:checked").val() + '</em>');

        update_map(regionsFileUrl, this.value, map.getZoom(), map.getCenter());

        initialise_slider(value=document.getElementById("timestamp-range").value);
    });

    // The following (commented out) is from when we still had choice of region types
    /*$("#estimation-regions-label").html('<em>' + $("input[name='region-method']:checked").val() + '</em>');
    $("#estimation-regions input").change(function() {
        $("#estimation-regions-label").html('<em>' + $("input[name='region-method']:checked").val() + '</em>');
        if(this.value === 'file'){
            var regionsUrl = regionsFileUrl;
            curDataUrl = dataUrl + '/' + $("input[name='estimation-method']:checked").val() + '/';
        }else{
           var regionsUrl = regionsHexagonsUrl + '/' +
               map.getBounds().getNorthWest().lat + '/' + map.getBounds().getNorthWest().lng + '/' +
               map.getBounds().getSouthEast().lat + '/' + map.getBounds().getSouthEast().lng;
           //alert($("input[name='estimation-method']:checked").val());
           curDataUrl = dataUrlDynamicRegions + '/' + this.value + '/' + $("input[name='estimation-method']:checked").val() + '/';
        }
        update_map(urlRegion=regionsUrl);
        initialise_slider(value=document.getElementById("timestamp-range").value);
    });*/


    // Downlaod data functions




    //Create map
    var map = L.map('mapid');
    var initZoom = 6;
    try {
        var initCenter = jQuery.parseJSON(centerLatLng);
    }catch{
        var initCenter = ["54.2361", "-4.5481"];
    }
    map.setView(initCenter, initZoom);
    map.options.minZoom = 5;
    map.options.maxZoom = 14;
    // bounds must be set after only the first initialisation of map
    var bounds = map.getBounds();

    $('#region-data').html(get_region_default());
    $('#sensor-data-instructions').html(get_sensor_default());

    update_map();
    // bounds must be set after only the first initialisation of map
    initialise_slider();

    initialise_sensor_fields();

    function initialise_sensor_fields(){
        /*
                Add Sensor fields (to UI sensor selection/filtering mechanism)

         */

        $.getJSON(sensorFieldsUrl, function (data) {
            // Add GeoJSON layer
            //alert(JSON.stringify(data));

            // Create the table for sensor fields
            var sensor_fields = '<table class="table table-striped">';

            for (var i=0; i<data.length; i++){
                var fieldName = data[i];

                // Add sensor field data to the table
                var row = '<tr class="select-button-row">' +
                    '<td class="field-name">' + fieldName + '</td>' +
                    '<td id="'+ slugify(fieldName) + '-used' +'" class="field-used chosen-option"></td></tr>';
                sensor_fields += row;
                // Add user input fields for selecting sensors
                var rows =
                    '<tr class="select-field-instructions info">' +
                        '<td></td>' +
                        '<td><div id="sensor-select-instructions">' +
                            '<em>Use comma delimited list of values <br> in <b>either</b> the ' +
                                '\'Select values\' <b>or</b> \'Omit values\' box. <br>' +
                                '(\'Omit values\' ignored if both used)' +
                    '       </em></div>' +
                    '   </td>' +
                    '</tr>' +
                    '<tr id="' + slugify(fieldName) + '-select' + '" class="selector-field info">' +
                        '<td>Select values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                    '</tr>' +
                    '<tr id="' + slugify(fieldName) + '-omit' + '" class="omittor-field info">' +
                    '   <td>Omit values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                    '</tr>';
                sensor_fields += rows;
            }
            sensor_fields += '</table>';

            // Add the table and instructions to the html div
            $('#collapseFilterSensors').html(sensor_fields);

            // Toggle the field selector / omittor fields (and instructions div) until required
            $("tr.selector-field, tr.omittor-field, tr.select-field-instructions").hide(); //, #sensor-select-instructions").hide();

            $("table .select-button-row").on('click', function(){
                $(this).nextUntil("tr.select-button-row").toggle('slow');
            });

            // If user presses enter while in selector / omittor fields, turn inputs to json and update map (ajax call).
            $("tr.selector-field input, tr.omittor-field input").on('keypress', function(e){
                if(e.keyCode === 13){ // Enter key

                    // Get the sensor field name to be filtered
                    var fieldNameId = this.closest('tr').id;
                    var fieldName2 = fieldNameId.replace('-select', '').replace('-omit','');

                    // Find previous selection request value, (if it matches new then no need to update map).
                    prevVal = $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html();

                    // Get the text from the select/omit edit boxes
                    var selectText = $('tr#' + fieldName2 + '-select input').val().trim();
                    var omitText = $('tr#' + fieldName2 + '-omit input').val().trim();

                    // If valid, create a newVal string and update the select/omit display div with this new value.
                    if( selectText !== '' && check_sensor_select_params(selectText) === true) {
                        var newVal = '<em>Select: [' + selectText+ ']</em>';
                        $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html(newVal);
                    }else{
                        if( omitText !== '' && check_sensor_select_params(omitText) === true) {
                            var newVal = '<em>Omit: [' + omitText + ']</em>';
                            $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html(newVal);
                        }else{
                            $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html('');
                        }
                    }

                    // Check if this edit boxes select/omit values have changed. If so update map.
                    if(newVal !== prevVal){
                        update_timeseries_map(document.getElementById("timestamp-range").value);
                    }
                }
            });
        });
    }

    function get_sensor_select_url_params(){
        var result = {'selectors':[]};
        $('#sensor-field-data table td.field-name').each(function(index){
            var fieldDict = {};
            var fieldName = $(this).html();
            var dictFieldName = {};

            var fieldSelectors = $(this).closest('tr').nextAll('tr.selector-field').first().find('input').val().trim();
            var fieldOmittors =  $(this).closest('tr').nextAll('tr.omittor-field') .first().find('input').val().trim();
            var fieldSelectorsJson = fieldSelectors.split(',').filter(Boolean);
            var fieldOmittorsJson =  fieldOmittors.split(',').filter(Boolean);

            if (fieldSelectorsJson.length > 0){
                dictFieldName['select_sensors'] = fieldSelectorsJson.map(Function.prototype.call, String.prototype.trim);
            }else{
                if (fieldOmittorsJson.length > 0) {
                    dictFieldName['omit_sensors'] = fieldOmittorsJson.map(Function.prototype.call, String.prototype.trim);
                }
            }
            if(Object.keys(dictFieldName).length > 0){
                fieldDict[fieldName] = dictFieldName;
                result['selectors'].push(fieldDict);
            }
        });
        return result;
    }

    function check_sensor_select_params(paramString){
        //todo check params
        // Must return true for empty string
        return true;
    }



    function initialise_slider(value=0){
        var slider = document.getElementById("timestamp-range");
        var output = document.getElementById("current-time");
        slider.min = 0;
        slider.max = timestampList.length-1;
        slider.value = value;
        output.innerHTML = timestampList[value]; // Display the default slider value
        update_timeseries_map(value);
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            output.innerHTML = timestampList[this.value];
        };
        slider.onchange = function() {
            update_timeseries_map(this.value);
        };

    }


    function update_timeseries_map(timeseries_idx=document.getElementById("timestamp-range").value,
                                   measurement=$("input[name='measurement']:checked").val()){
        var timeseries_val = timestampList[timeseries_idx].trim();
        var dataUrl = curDataUrl + measurement + '/' + timeseries_val + '/';
        var jsonParams = get_sensor_select_url_params();
        jsonParams['csrfmiddlewaretoken'] = getCookie('csrftoken');


        // Set up loader display
        var loaderOuterDiv = document.getElementById('loader-outer');
        var loaderDiv = document.createElement('div');
        loaderDiv.id = 'loader';
        loaderOuterDiv.appendChild(loaderDiv);
        drawLoader(loaderDiv, '<p>Collecting sensor data...</p>');

        // 1. Update sensors to show values

        // Clear sensor and region data
        sensorsLayer.clearLayers();
        for (var key in regions){
            regions[key].setStyle({
                'fillColor': 'transparent',
                'fillOpacity': 0.2,
              });
        };

        //alert(dataUrl);
        //alert(JSON.stringify(jsonParams));
        $.ajax({
            url: dataUrl,
            data:JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 1000000,
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


                    //onSensorClick(measurement, sensorId, regionId, sensorName)

                    var button = document.createElement('button');
                    button.name = 'get-timeseries';
                    button.innerHTML = 'Get timeseries';
                    button.setAttribute("onclick", "onSensorClick('"+measurement+"','" +loc.sensor_id + "','" + loc.regions + "','" + loc.name + "')");
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
            error: function (request, state, errors) {
                    alert("There was an problem fetching the data: " + errors.toString());
            },
            complete: function (request, status) {
                // Clear Loader
                while (loaderOuterDiv.firstChild) {
                    loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
                }
            }
        });

    }

    function update_map(urlRegion=regionsFileUrl, mapType='street-map', zoomLevel=initZoom, mapCenter=initCenter){
        map.setView(mapCenter, zoomLevel);

        /*
                Initialise map

         */

        var accessToken = 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew';

        var mapId = 'mapbox.streets';
        var mapUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
        var mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' +
                ' contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
                ', Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

        switch(mapType) {
          case 'street-map':
            mapId = 'mapbox.streets';
            mapUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
            mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' +
                ' contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
                ', Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
            break;
          case 'topology':
            mapId = 'mapbox.streets';
            mapUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
            mapAttribution = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
                ' contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: ' +
                '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> ' +
                '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';
            break;
        }

        // Set up loader display
        var loaderOuterDiv = document.getElementById('loader-outer');
        var loaderDiv = document.createElement('div');
        loaderDiv.id = 'loader';
        loaderOuterDiv.appendChild(loaderDiv);
        drawLoader(loaderDiv, '<p>Setting up map and region data...</p>');

        L.tileLayer(
            mapUrl,
           {
                maxZoom: 18,
                attribution: mapAttribution,
                id: mapId,
                accessToken: accessToken
            }
        ).addTo(map);

        function locateBounds () {
         // geolocate
        }
        (new L.Control.ResetView(bounds)).addTo(map);


         /*
                Add Regions to map

         */

        regionsLayer.clearLayers();
        $.ajax({
            url: urlRegion,
            dataType: 'json',
            async: false,
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
                              $('#region-data').html(get_region_default())
                            });
                        }
                    },
                );
                regionsLayer.addLayer(geoLayer);
                regionsLayer.addTo(map);
            },
            error: function (request, state, errors) {
                    alert("There was an problem fetching the region meta-data: " + errors.toString());
            },
            complete: function (request, status) {
                    // Clear Loader
                while (loaderOuterDiv.firstChild) {
                    loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
                }
            }
        });
    };
});

// File downloads



function download_csv(url, filename){
    // Set up loader display
    var loaderOuterDiv = document.getElementById('loader-outer');
    var loaderDiv = document.createElement('div');
    loaderDiv.id = 'loader';
    loaderOuterDiv.appendChild(loaderDiv);
    drawLoader(loaderDiv, '<p>Downloading ' + filename + '...</p>');



    $.ajax({
        url: url,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'text',
        method: 'POST',
        timeout: 60000,
        async: true,
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            if (!data.match(/^data:text\/csv/i)) {
                data = 'data:text/csv;charset=utf-8,' + data;
            }
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (request, state, errors) {
            alert("There was an problem downloading the CSV data: " + errors.toString());
        },
        complete: function (request, status) {
            // Clear Loader
            while (loaderOuterDiv.firstChild) {
                loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
            }
        }
    })
};

function download_geojson(url, filename){
    // Set up loader display
    var loaderOuterDiv = document.getElementById('loader-outer');
    var loaderDiv = document.createElement('div');
    loaderDiv.id = 'loader';
    loaderOuterDiv.appendChild(loaderDiv);
    drawLoader(loaderDiv, '<p>Downloading ' + filename + '...</p>');



    $.ajax({
        url: url,
        dataType: 'json',
        async: true,
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (request, state, errors) {
            alert("There was an problem downloading the GeoJSON data: " + errors.toString());
        },
        complete: function (request, status) {
            // Clear Loader
            while (loaderOuterDiv.firstChild) {
                loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
            }
        }
    })
};


function download_json(url, filename){
    // Set up loader display
    var loaderOuterDiv = document.getElementById('loader-outer');
    var loaderDiv = document.createElement('div');
    loaderDiv.id = 'loader';
    loaderOuterDiv.appendChild(loaderDiv);
    drawLoader(loaderDiv, '<p>Downloading ' + filename + '...</p>');



    $.ajax({
        url: url,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 90000,
        async: true,
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (request, state, errors) {
            alert("There was an problem downloading the JSON data: " + errors.toString());
        },
        complete: function (request, status) {
            // Clear Loader
            while (loaderOuterDiv.firstChild) {
                loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
            }
        }
    })
};


// File downloads

function get_csv(url, filename='data.csv', jsonParams={}){
    // Set up loader display
    var loaderOuterDiv = document.getElementById('loader-outer');
    var loaderDiv = document.createElement('div');
    loaderDiv.id = 'loader';
    loaderOuterDiv.appendChild(loaderDiv);
    drawLoader(loaderDiv, '<p>Downloading data...</p>');



    $.ajax({
        url: url,
        data: JSON.stringify(jsonParams),
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'text',
        method: 'POST',
        timeout: 40000,
        async: false,
        success: function (data) {
            if (!data.match(/^data:text\/csv/i)) {
                data = 'data:text/csv;charset=utf-8,' + data;
            }

            link = document.createElement('a');
            link.setAttribute('href', data);
            link.setAttribute('download', filename);
            link.click();

        },
        error: function (request, state, errors) {
            alert("There was an problem downloading the data: " + errors.toString());
        },
        complete: function (request, status) {
            // Clear Loader
            while (loaderOuterDiv.firstChild) {
                loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
            }
        }
    })
};


function onSensorClick(measurement, sensorId, regionId, sensorName) {
    var estimationMethod = $("input[name='estimation-method']:checked").val();

    var listItem = document.createElement('a');
    listItem.className = "list-group-item list-group-item-action flex-column align-items-start sensor-chart";
    listItem.href = '#';
    var listItemDiv = document.createElement('div');
    listItemDiv.className = 'd-flex w-100 justify-content-between';
    var canvasItem = document.createElement('canvas');
    canvasItem.id="sensor-chart";
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
    var span= document.createElement('span');
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
    newChartTitle.onclick = function() {
      modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

    getActualTimeseries(measurement, sensorId, listChart, modalChart);
    getEstimatedTimeseries(measurement, estimationMethod, regionId, sensorId, listChart, modalChart);
}

function getTimestampValue(data, timestamp) {
    for (var i=0; i<data.length; i++){
        if(data[i]['timestamp'].trim() == timestamp.trim()){
            //alert('timestamp: ' + timestamp + '; dataItem: ' + data[i]['timestamp']);
            return data[i]['percent_score'];
        }
    }
    return null;
}

function getActualTimeseries(measurement, sensorId, listChart, modalChart){
    //url: sensor_timeseries/<slug:measurement>/<int:sensor_id>

    var actualUrl = sensorTimeseriesUrl + '/' + measurement + '/' + sensorId + '/';
    //alert(actualUrl);
    $.ajax({
        url: actualUrl,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 60000,
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
        error: function (request, state, errors) {
            alert("There was an problem obtaining the sensor timeseries data: " + errors.toString());
        }
    });
}

function getEstimatedTimeseries(measurement, method, regionId, ignoreSensorId, listChart, modalChart){
    //url: estimated_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/<int:ignore_sensor_id>/
    var url_estimates = estimatedTimeseriesUrl + '/' + method + '/' + measurement + '/' + regionId + '/' + ignoreSensorId + '/';

    //alert(url_estimates);
    $.ajax({
        url: url_estimates,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 60000,
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
        error: function (request, state, errors) {
            alert("There was an problem obtaining the estimated timeseries data: " + errors.toString());
            return []
        }
    });
}


function getGreenToRed(percent){
    g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
    r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
    return 'rgb('+r+','+g+',0)';
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function slugify(string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return string.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}


function drawLoader(loaderDiv, explanation, sizeOneToFive=3){
    loaderDiv.style.zIndex = 2000;
    var strClassSuffix = '';
    if(isNumeric(sizeOneToFive) & parseInt(sizeOneToFive) >=1 & parseInt(sizeOneToFive) <=5) {
        strClassSuffix = ' size-' + sizeOneToFive.toString();
    }

    // Delete previous if exists
    if($(loaderDiv).children(".ajax-waiting-explanation").length){
        // Remove
        $(loaderDiv).children(".ajax-waiting-explanation").remove();
    }

    // Draw new loader
    var divWaitingExplanation = document.createElement('div');
    divWaitingExplanation.className = 'ajax-waiting-explanation';
    var divAjaxWaitText = document.createElement('div');
    divAjaxWaitText.className = 'ajax-waiting-text' + strClassSuffix;
    divAjaxWaitText.innerHTML = explanation;
    var divLoader = document.createElement('div');
    divLoader.className = 'ajax-call-loader' + strClassSuffix;
    divWaitingExplanation.appendChild(divLoader);
    divWaitingExplanation.appendChild(divAjaxWaitText);
    loaderDiv.appendChild(divWaitingExplanation);
}

// Make the DIV element draggable:
// Code from: https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function get_region_default(){
    return '<p><b>Region: </b>None</p>' +
    '<table class="table table-striped">' +
        '<tr><td colspan="2"><p>Hover over regions to see region data.</p></td></tr></table>';
}

function get_sensor_default(){
    return '<table class="table table-striped">' +
            '<tr><td colspan="2"><p>Click on a sensor to see sensor info and the option to see sensor and estimated data across <em>all</em> timestamps.</p></td></tr>' +
            '<tr><td colspan="2"><p>If no sensors exist for this timestamp, either: </p>' +
            '<p>(i) use slider to find another timestamp</p>' +
            '<p>(ii) use \'Select measurement\' option to change measurements.</p></td></tr>' +
        '</table>';
}

function cloneCanvas(oldCanvas) {

    //create a new canvas
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
}


// ******************************************************************
// ****************** CSRF-TOKEN SET-UP *****************************
// ******************************************************************

// using jQuery
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});
// ******************************************************************
// ********************* CSRF-TOKEN END *****************************
// ******************************************************************