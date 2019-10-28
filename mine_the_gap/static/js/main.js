$(document).ready(function(){
    /*    */
});

function initialise_map(map, options) {
    var lon = "-4.5481";
    var lat = "54.2361";
    map.setView([lat, lon], 5.5);

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


    //var markerClusters = L.markerClusterGroup();

    /*$.each(actual_data['location'], function (i, actual_data_point) {

        url = mapIconPath + '/map-marker_green.png';

        var myIcon = L.icon({
            iconUrl: url,
            iconSize: [40, 40],
            //iconAnchor: [53.4671216, -2.2344166],
            //popupAnchor: [-3, -76]
            //shadowUrl: 'my-icon-shadow.png',
            //shadowSize: [68, 95],
            //shadowAnchor: [22, 94]
        });
        var marker = L.marker([actual_data_point['lat'], actual_data_point['long']], {icon: myIcon});
        //marker.bindPopup("<b>" + actual_data_point['description'] + '</b><br>' + actual_data_point['tags']);

        markerClusters.addLayer(marker);
    });

    map.addLayer( markerClusters );*/

}



