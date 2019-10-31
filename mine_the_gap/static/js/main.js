$(document).ready(function(){
    //var timestampList =
});


function initialise_slider(timestampRange, actualDataUrl, estimatedDataUrl){
    //alert(timestampRange[1]);

    var slider = document.getElementById("timestamp-range");
    var output = document.getElementById("current-timestamp");
    slider.min = 0;
    slider.max = timestampRange.length-1;
    slider.value = 0;
    output.innerHTML = 0;//timestampRange[this.value]; //slider.value; // Display the default slider value

    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function() {
        output.innerHTML = timestampRange[this.value];
        update_timeseries_map(
                                actualDataUrl + this.value.toString(),
                                estimatedDataUrl + this.value.toString()
                            );
    }

}

function update_timeseries_map(actualDataUrl, estimatedDataUrl){

    // Sensor time series (actual data)
    //alert(actualDataUrl);

    // Download GeoJSON via Ajax
    $.getJSON(actualDataUrl, function (data) {
        // Add GeoJSON layer

        //alert(JSON.stringify(data));

        /*
            [   {"timestamp":"2017-03-22 00:00:00+00","value":102,"sensor_id":757,"id":640849},
                {"timestamp":"2017-03-22 00:00:00+00","value":135,"sensor_id":754,"id":640850},
                {"timestamp":"2017-03-22 00:00:00+00","value":55,"sensor_id":755,"id":640851},
                ...
             ]
         */

        for (var i=0; i < data.length; i++){
            alert(JSON.stringify(data[i]));
            alert(L.map);


            $.each(L.map._layers, function (ml) {
                alert(1);
                var layer = L.map._layers[ml];
                if (layer.feature) {
                    alert(2);
                    // L.marker(latlng, {icon: myIcon, id: feature.properties.popupContent.sensor_id});
                    if (layer._id = data[i]['sensor_id']){
                        alert(3);
                    }

                }
            });
        }


        /*map.addLayer(L.geoJson(
            data,
            {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: myIcon});
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(
                        '<p>' + JSON.stringify(feature.geometry.coordinates) + '</p>' +
                        '<p>' + feature.properties.popupContent.replace("', '", '\'<br>\'').replace('[', '').replace(']', '') + '</p>');
                }

            }
        ));*/

    });


}


function initialise_map(map, options, mapIconPath, sensorDataUrl, regionDataUrl) {
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


    var myIcon = L.icon({
                    iconUrl: mapIconPath + '/marker-icon.png',
                    iconSize: [10,15],
                    //iconAnchor: [22, 94],
                    //popupAnchor: [-3, -76],
                });

    // Download GeoJSON via Ajax
    $.getJSON(sensorDataUrl, function (data) {
        // Add GeoJSON layer

        // Uncomment (1/2) if we want to use markercluster
        //var markers = L.markerClusterGroup();

        // Uncomment (2/3) if we want to use markercluster (and comment map.addLayer below)
        //markers.addLayer(L.geoJson(
        map.addLayer(L.geoJson(
            data,
            {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: myIcon, id: feature.properties.popupContent.sensor_id});
                },
                onEachFeature: function (feature, layer) {
                    //layer.id =
                    layer.bindPopup(
                        '<p>' + JSON.stringify(feature.geometry.coordinates) + '</p>' +
                        '<p>'
                            + feature.properties.popupContent.extra_data.replace(
                            "', '", '\'<br>\'').replace('[', '').replace(']', '') +
                        '</p>');
                }

            }
        ));

        // Uncomment (3/3) if we want to use markercluster
        //map.addLayer(markers);

    });

    $.getJSON(regionDataUrl, function (data) {
        // Add GeoJSON layer
        L.geoJson(
            data,
            {   onEachFeature: function (feature, layer) {
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
        ).addTo(map);
    });

}





