$(document).ready(function(){

    $("div#select-files").hide();
    // Upload files toggle button
        $("button#btn-select-files").click(function(){
        $("div#select-files").toggle('slow');
      });

    var curEstimatedDataUrl = estimatedDataUrl + '/file/';
    var curActualDataUrl = actualDataUrl + '/';

    $("#estimation-method>input").change(function() {
        curEstimatedDataUrl = estimatedDataUrl + '/' + this.value + '/';
        initialise_map(mapType=$("#map-overlays>input").value, zoomLevel=map.getZoom(), mapCenter=map.getCenter());
        initialise_slider(value=document.getElementById("timestamp-range").value);
    });



    //Create map
    var map = L.map('mapid');
    var sensorsLayer = new L.LayerGroup();
    var regionsLayer = new L.LayerGroup();
    var regions = {};

    initialise_map(map);
    initialise_slider();

    $("#map-overlays>input").change(function() {
        initialise_map(mapType=this.value, zoomLevel=map.getZoom(), mapCenter=map.getCenter());
        initialise_slider(value=document.getElementById("timestamp-range").value);
    });


    function initialise_slider(value=0){
        var slider = document.getElementById("timestamp-range");
        var output = document.getElementById("current-timestamp");
        slider.min = 0;
        slider.max = timestampList.length-1;
        slider.value = value;
        output.innerHTML = timestampList[value]; // Display the default slider value
        update_timeseries_map(curActualDataUrl+value.toString(), curEstimatedDataUrl+value.toString());
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            output.innerHTML = timestampList[this.value];
        };
        slider.onchange = function() {
            update_timeseries_map(
                                    curActualDataUrl + this.value.toString(),
                                    curEstimatedDataUrl + this.value.toString()
                                );
        };

    }


    function update_timeseries_map(actualDataUrl, estimatedDataUrl){

        // 1. Update sensors to show values

        sensorsLayer.clearLayers();

        $.getJSON(actualDataUrl, function (data) {
                /*[
                    {   "extra_data":"['Aberdeen Union Street Roadside', 'AB', '179 Union St, Aberdeen AB11 6BB, UK']",
                        "value":66,
                        "timestamp":"2017-01-01 00:00:00+00",
                        "percent_score":0.436241610738255,
                        "sensor_id":757,
                        "geom":[-2.1031362,57.1453481]
                    }
                  ]
                */

            for (var i=0; i<data.length; i++){
                var loc = data[i];
                /*if(i==0) {
                    alert(JSON.stringify(loc));
                }*/
                var latlng = [loc.geom[1], loc.geom[0]];
                var valColor = getGreenToRed(loc.percent_score*100).toString();
                var marker = new L.Marker.SVGMarker(latlng,
                        {   iconOptions: {
                                color: valColor,
                                iconSize: [30,40],
                                circleText: loc.value.toString(),
                                circleRatio: 0.8,
                                fontSize:8
                            }
                        }
                    );

                // Add marker
                marker.bindPopup("<b>" + loc.geom + '</b><br><p>Value: ' + loc['value'].toString() +
                    '<p>Percentage Score: ' + loc['percent_score'].toString() +
                    '<br>' +
                    'Timestamp: ' + loc['timestamp'].toString()  + '</p>' + loc['extra_data'] );

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
                         "timestamp":"2017-08-22 00:00:00+00",
                         "percent_score": 0.33557046979865773
                     }
                  ]
                */

            // Update regions to show values
            for (var i=0; i<data.length; i++){
                var region = data[i];
                //alert(JSON.stringify(region));

                var layer = regions[region.region_id];

                var valColor = getGreenToRed(region.percent_score*100).toString();
                layer.setStyle({
                            'fillColor': valColor,
                            'weight': '1'
                          });
                try {
                    layer.bindTooltip(region.value.toString() + '<br>' + region.extra_data,
                        {permanent: false, direction: "center", opacity: 0.9}
                    )
                }catch (e) {
                    //alert(JSON.stringify(region));
                }

            }
        });


    }

    function initialise_map(mapType='street-map', zoomLevel=6, mapCenter=["54.2361","-4.5481"]){
        //var lon = "-4.5481";
        //var lat = "54.2361";
        map.setView(mapCenter, zoomLevel);
        map.options.minZoom = 5;
        map.options.maxZoom = 14;
        var bounds = map.getBounds();

        // Initialise map
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

        L.tileLayer(
            mapUrl,
           {
                maxZoom: 18,
                attribution: mapAttribution,
                id: mapId,
                accessToken: accessToken
            }


           /* , {
                attribution:
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'pk.eyJ1IjoiYW5uZ2xlZHNvbiIsImEiOiJjazIwejM3dmwwN2RkM25ucjljOTBmM240In0.2jLikF_JryviovmLE3rKew'
            }*/
        ).addTo(map);

        function locateBounds () {
         // geolocate
        }
        (new L.Control.ResetView(bounds)).addTo(map);

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
                              $('#region-data').html(
                                  '<p> Region ID: ' + feature.properties.popupContent.region_id + '</p>' +
                                  '<p> Extra Data: ' + JSON.stringify(feature.properties.popupContent.extra_data) + '</p>');
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

function getGreenToRed(percent){
    g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
    r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
    return 'rgb('+r+','+g+',0)';
}











