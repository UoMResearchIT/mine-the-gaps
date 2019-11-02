$(document).ready(function(){
    var lon = "-4.5481";
    var lat = "54.2361";
    var map = L.map('mapid').setView([lat, lon], 6);
    map.options.minZoom = 5;
    map.options.maxZoom = 14;

    var sensorsLayer = new L.LayerGroup();
    var regionsLayer = new L.LayerGroup();
    var regions = {};


    // Initialise map

    L.tileLayer(
        //'https://api2.ordnancesurvey.co.uk/mapping_api/v1/service/zxy/EPSG%3A3857/Outdoor 3857/{z}/{x}/{y}.png?'
        //    + 'key=dLrw1sspLHoFDB0qbDNVPvlfG5FwXkxA',
        //'https://api2.ordnancesurvey.co.uk/mapping_api/v1/service/zxy/EPSG%3A3857/Outdoor%203857/{z}/{x}/{y}.png?' + 'key=dLrw1sspLHoFDB0qbDNVPvlfG5FwXkxA',
        //{
        //    maxZoom: 20,
        //    minZoom: 7
        //}
        'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox.streets',
            accessToken: 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew'
        }
    ).addTo(map);

    function locateBounds () {
     // geolocate
        //(49.383639452689664, -17.39866406249996)
        //(59.53530451232491, 8.968523437500039)

         return L.latLngBounds(
             [  [49.383639452689664, -17.39866406249996],
                [59.53530451232491, 8.968523437500039]
             ]
         );
    }

    (new L.Control.ResetView(locateBounds)).addTo(map);


    initialise_map(map);
    initialise_slider();


    function initialise_slider(){
        var slider = document.getElementById("timestamp-range");
        var output = document.getElementById("current-timestamp");
        slider.min = 0;
        slider.max = timestampList.length-1;
        slider.value = 0;
        output.innerHTML = timestampList[0]; // Display the default slider value
        update_timeseries_map(actualDataUrl+'0', estimatedDataUrl+'0');
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            output.innerHTML = timestampList[this.value];
            update_timeseries_map(
                                    actualDataUrl + this.value.toString(),
                                    estimatedDataUrl + this.value.toString()
                                );
        };

    }


    function update_timeseries_map(actualDataUrl, estimatedDataUrl){

        // 1. Update sensors to show values

        sensorsLayer.clearLayers();

        $.getJSON(actualDataUrl, function (data) {
                /*[
                    {
                        "geom":[-2.1031362,57.1453481],  // Need swapping around!!
                        "sensor_id":757,
                        "value":100,
                        "timestamp":"2017-06-06 00:00:00+00",
                        "extra_data":"['Aberdeen Union Street Roadside', 'AB', '179 Union St, Aberdeen AB11 6BB, UK']"}
                  ]
                */

            for (var i=0; i<data.length; i++){
                var loc = data[i];
                var latlng = [loc.geom[1], loc.geom[0]];

                var iconColor = "rgb(0,0,100)";

                var marker = new L.Marker.SVGMarker(latlng, { iconOptions: { color: iconColor, iconSize: [10,15]}});

                // Add marker
                marker.bindPopup("<b>" + loc.geom + '</b><br><p>Value: ' + loc['value'].toString()  + '</p><br>' +
                    '<p>Timestamp: ' + loc['timestamp'].toString()  + '</p>' + loc['extra_data'] );

                sensorsLayer.addLayer(marker);
            }

            sensorsLayer.addTo(map);

        });



        $.getJSON(estimatedDataUrl, function (data) {
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
                         "timestamp":"2017-08-22 00:00:00+00"
                     }
                  ]
                */

            // Update regions to show values
            for (var i=0; i<data.length; i++){
                var region = data[i];

                var layer = regions[region.region_id];
                layer.setStyle({
                            'fillColor': 'pink',
                            'weight': '1'
                          });


            }
        });


    }

    function initialise_map(){
        var lon = "-4.5481";
        var lat = "54.2361";
        map.setView([lat, lon], 6);

        map.options.minZoom = 5;
        map.options.maxZoom = 14;

        L.tileLayer(
            //'https://api2.ordnancesurvey.co.uk/mapping_api/v1/service/zxy/EPSG%3A3857/Outdoor 3857/{z}/{x}/{y}.png?'
            //    + 'key=dLrw1sspLHoFDB0qbDNVPvlfG5FwXkxA',
            //'https://api2.ordnancesurvey.co.uk/mapping_api/v1/service/zxy/EPSG%3A3857/Outdoor%203857/{z}/{x}/{y}.png?' + 'key=dLrw1sspLHoFDB0qbDNVPvlfG5FwXkxA',
            //{
            //    maxZoom: 20,
            //    minZoom: 7
            //}
            'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew'
            }
        ).addTo(map);

        function locateBounds () {
         // geolocate

            //(49.383639452689664, -17.39866406249996)
            //(59.53530451232491, 8.968523437500039)

             return L.latLngBounds(
                 [  [49.383639452689664, -17.39866406249996],
                    [59.53530451232491, 8.968523437500039]
                 ]
             );
        }
        (new L.Control.ResetView(locateBounds)).addTo(map);

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

                        //layer.bindPopup(
                        //    '<p>' + JSON.stringify(feature.properties.popupContent) + '</p>');

                        layer.on('mouseover', function () {
                              this.setStyle({
                                //'fillColor': '#ff3b24'
                                  'weight': '5'
                              });
                              $('#region-label').html(
                                  '<p>' + feature.properties.popupContent.region_id + '</p>');
                              $('#extra-data').html(
                                  '<p>' + JSON.stringify(feature.properties.popupContent.extra_data) + '</p>');
                        });
                        layer.on('mouseout', function () {
                          this.setStyle({
                            //'fillColor': 'transparent'
                              'weight': '1'
                          });
                        });

                    }
                }
            );
            regionsLayer.addLayer(geoLayer);
        });

        regionsLayer.addTo(map);
    }

});










