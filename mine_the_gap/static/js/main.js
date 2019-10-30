$(document).ready(function(){

});


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

    var sensor_dataurl = sensorDataUrl;
    // Download GeoJSON via Ajax
    $.getJSON(sensor_dataurl, function (data) {
        // Add GeoJSON layer

        // Uncomment (1/2) if we want to use markercluster
        //var markers = L.markerClusterGroup();

        // Uncomment (2/3) if we want to use markercluster (and comment map.addLayer below)
        //markers.addLayer(L.geoJson(
        map.addLayer(L.geoJson(
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
        ));

        // Uncomment (3/3) if we want to use markercluster
        //map.addLayer(markers);

    });

    var region_dataurl = regionDataUrl;
    $.getJSON(region_dataurl, function (data) {
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
                              '<p>' + feature.properties.popupContent.region_label + '</p>');
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





