var dataurl = '{% url "data" %}';

window.addEventListener("map:init", function (event) {
    var map = event.detail.map;
    // Download GeoJSON data with Ajax
    fetch(dataurl)
      .then(function(resp) {
        return resp.json();
      })
      .then(function(data) {
        L.geoJson(data, {
          onEachFeature: function onEachFeature(feature, layer) {
            var props = feature.properties;
            var content = `<img width="300" src="${props.picture_url}"/><h3>${props.title}</h3><p>${props.description}</p>`;
            layer.bindPopup(content);
        }}).addTo(map);
      });
});