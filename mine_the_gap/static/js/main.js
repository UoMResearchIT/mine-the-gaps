$(document).ready(function(){
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
    // ****************** CSRF-TOKEN END *****************************
    // ******************************************************************

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

    var curEstimatedDataUrl = estimatedDataUrl + '/file/';
    var curActualDataUrl = actualDataUrl + '/';

    $("#estimation-method>input").change(function() {
        curEstimatedDataUrl = estimatedDataUrl + '/' + this.value + '/';
        //update_map(mapType=$("#map-overlays>input[name=map-type]:checked").val(), zoomLevel=map.getZoom(), mapCenter=map.getCenter());
        initialise_slider(value=document.getElementById("timestamp-range").value);
    });


    // Initialise layer lists for later use
    var sensorsLayer = new L.LayerGroup();
    var regionsLayer = new L.LayerGroup();
    var regions = {};
    var sensors = {};

    //Create map
    var map = L.map('mapid');
    var initZoom = 6;
    var initCenter = ["54.2361","-4.5481"];
    map.setView(initCenter, initZoom);
    map.options.minZoom = 5;
    map.options.maxZoom = 14;
    // bounds must be set after only the first initialisation of map
    var bounds = map.getBounds();

    update_map(map);
    // bounds must be set after only the first initialisation of map
    initialise_slider();

    initialise_sensor_fields();



    $("#map-overlays>input").change(function() {
        update_map(mapType=this.value, zoomLevel=map.getZoom(), mapCenter=map.getCenter());
        initialise_slider(value=document.getElementById("timestamp-range").value);
    });

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
                    '<td><button class="field-selector-button">' + fieldName + '</button></td>' +
                    '<td></td></tr>';
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
                    '<tr class="selector-field info">' +
                        '<td>Select values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                    '</tr>' +
                    '<tr class="omittor-field info">' +
                    '   <td>Omit values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                    '</tr>';
                sensor_fields += rows;
            }
            sensor_fields += '</table>';

            // Add the table and instructions to the html div
            $('#sensor-field-data').html(
                '<b>Select sensors using fields:</b>'+ sensor_fields
            );

            // Toggle the field selector / omittor fields (and instructions div) until required
            $("tr.selector-field, tr.omittor-field, tr.select-field-instructions").hide(); //, #sensor-select-instructions").hide();
            $("table button.field-selector-button").click(function(){
                $(this).closest( "tr" ).nextUntil("tr.select-button-row").toggle('slow');
            });

            // If user presses enter while in selector / omittor fields, turn inputs to json and update map (ajax call).
            $("tr.selector-field input, tr.omittor-field input").on('keypress', function(e){
                if(e.keyCode == 13){ // Enter key
                    if(check_sensor_select_params() == true) {
                        //alert(JSON.stringify(get_sensor_select_url_params()));
                        update_timeseries_map(document.getElementById("timestamp-range").value);
                    }
                }
            });
        });
    }

    function get_sensor_select_url_params(){
        var result = {'selectors':[]};
        $('#sensor-field-data table button.field-selector-button').each(function(index){
            var fieldDict = {};
            var fieldName = $(this).text();
            var dictFieldName = {};

            var fieldSelectors = $(this).closest('tr').nextAll('tr.selector-field').first().find('input').val().trim();
            var fieldOmittors =  $(this).closest('tr').nextAll('tr.omittor-field') .first().find('input').val().trim();
            var fieldSelectorsJson = fieldSelectors.split(',').filter(Boolean);
            var fieldOmittorsJson =  fieldOmittors.split(',').filter(Boolean);

            if (fieldSelectorsJson.length > 0){
                dictFieldName['select_sensors'] = fieldSelectorsJson;
            }else{
                if (fieldOmittorsJson.length > 0) {
                    dictFieldName['omit_sensors'] = fieldOmittorsJson;
                }
            }
            if(Object.keys(dictFieldName).length > 0){
                fieldDict[fieldName] = dictFieldName;
                result['selectors'].push(fieldDict);
            }
        });
        return result;
    }

    function check_sensor_select_params(){
        return true;
    }

    function initialise_slider(value=0){
        var slider = document.getElementById("timestamp-range");
        var output = document.getElementById("current-timestamp");
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


    function update_timeseries_map(timeseries_idx){
        var actualDataUrl = curActualDataUrl + timeseries_idx.toString() + '/';
        var estimatedDataUrl = curEstimatedDataUrl + timeseries_idx.toString() + '/';
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


        $.ajax({
            url: actualDataUrl,
            data:JSON.stringify(jsonParams),
            headers: { "X-CSRFToken": csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 20000,
            success: function (data) {

                /*[
                    {   "extra_data":"['AB', '179 Union St, Aberdeen AB11 6BB, UK']",
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

                for (var i=0; i<data.length; i++){
                    var loc = data[i];
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


                    var marker = new L.Marker.SVGMarker(latlng,
                            {   iconOptions: {
                                    color: valColor,
                                    iconSize: [30,40],
                                    circleText: locValue,
                                    circleRatio: 0.8,
                                    fontSize:8
                                }
                            }
                        );

                    // Add marker

                    var extraData = '<table class="table table-striped">';
                    extraData += '<tr><th>Name</th><td>' + loc.name + '</td></tr>';
                    extraData += '<tr><th>Location</th><td>' + loc.geom + '</td></tr>';
                    extraData += '<tr><th>Timestamp</th><td>' + loc.timestamp.toString() + '</td></tr>';
                    extraData += '<tr><th>Value</th><td>' + loc.value + '</td></tr>';
                    extraData += '<tr><th>Percentage Score</th><td>' +  (loc.percent_score*100).toFixed(2).toString()  + '</td></tr>';
                    for (var key in loc['extra_data']){
                        extraData += '<tr><th>' + key  + '</th><td>' + loc['extra_data'][key] + '</td></tr>';
                    };
                    extraData += '</table>';

                    marker.bindPopup(extraData);

                    sensorsLayer.addLayer(marker);
                };
                sensorsLayer.addTo(map);
            },
            error: function (request, state, errors) {
                    alert("There was an problem fetching the sensor data: " + errors.toString());
            },
            complete: function (request, status) {
                    // Clear Loader
                while (loaderOuterDiv.firstChild) {
                    loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
                }
            }
        });

        // Set up loader display
        drawLoader(loaderDiv, '<p>Collecting estimation data...</p>');


        $.ajax({
            url: estimatedDataUrl,
            data: JSON.stringify(jsonParams),
            headers: {"X-CSRFToken": csrftoken},
            dataType: 'json',
            method: 'POST',
            timeout: 20000,
            success: function (data) {

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
                         "extra_data":"['1']",
                         "timestamp":"2017-08-22 00:00:00+00",
                         "percent_score": 0.33557046979865773
                     }
                  ]
                */

                // Update regions to show values
                for (var i=0; i<data.length; i++){
                    var region = data[i];
                    //if (i==0){
                    //    alert(JSON.stringify(region));
                    //}

                    var layer = regions[region.region_id];

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
                    alert("There was an problem fetching the estimation data: " + errors.toString());
            },
            complete: function (request, status) {
                    // Clear Loader
                while (loaderOuterDiv.firstChild) {
                    loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
                }
            }
        });



    }

    function update_map(mapType='street-map', zoomLevel=initZoom, mapCenter=initCenter){
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
        $.getJSON(regionDataUrl, function (data) {
            // Add GeoJSON layer
            var geoLayer = L.geoJson(
                data,
                {   onEachFeature: function (feature, layer) {
                        regions[feature.properties.popupContent.region_id] = layer;
                        layer.setStyle({
                            'fillColor': 'transparent',
                            'weight': '1'
                          });

                        var extraData = '<table class="table table-striped">';
                        for (var key in feature.properties.popupContent.extra_data){
                            extraData += '<tr><th>' + key  + '</th><td>' + feature.properties.popupContent.extra_data[key] + '</td></tr>';
                        };
                        extraData += '</table>';

                        layer.on('mouseover', function () {
                              this.setStyle({
                                //'fillColor': '#ff3b24'
                                  'weight': '5'
                              });
                              $('#region-data').html(
                                  '<p><b>Region: </b>' + feature.properties.popupContent.region_id + '</p>' +
                                  extraData
                              );
                        });
                        layer.on('mouseout', function () {
                          this.setStyle({
                            //'fillColor': 'transparent'
                            'weight': '1'
                          });
                        });

                    }
                },

            );
            regionsLayer.addLayer(geoLayer);
        });
        regionsLayer.addTo(map);

        while (loaderOuterDiv.firstChild) {
            loaderOuterDiv.removeChild(loaderOuterDiv.firstChild);
        }
    }

});

function getGreenToRed(percent){
    g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
    r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
    return 'rgb('+r+','+g+',0)';
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
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












