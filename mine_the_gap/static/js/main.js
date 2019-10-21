
function uploadFile(event) {
    event.preventDefault();
    var data = new FormData($('form').get(0));

    $.ajax({
        url: $(this).attr('action'),
        type: $(this).attr('method'),
        data: data,
        cache: false,
        processData: false,
        contentType: false,
        success: function(data) {
            alert('success');
        }
    });
    return false;
}

$(document).ready(function(){
    var lon = "-4.5481";
    var lat = "54.2361";
    var map = L.map('mapid').setView([lat, lon], 5.5);

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


  $("#file-upload-form").submit(function(e){
    uploadFile(e);
  });
});