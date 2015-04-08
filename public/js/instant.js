var map = L.map('map').setView([39.2854197594374, -76.61796569824219], 12);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
}).addTo(map);

var geocoder = new google.maps.Geocoder();




function googleGeocoding(text, callResponse)
{
    geocoder.geocode({address: text}, callResponse);
}

function filterJSONCall(rawjson)
{
    var json = {},
        key, loc, disp = [];

    for(var i in rawjson)
    {
        key = rawjson[i].formatted_address;

        loc = L.latLng( rawjson[i].geometry.location.lat(), rawjson[i].geometry.location.lng() );

        json[ key ]= loc;	//key,value format
    }

    return json;
}

var searchControl = new L.Control.Search({
    callData: googleGeocoding,
    filterJSON: filterJSONCall,
    autoType: false,
    autoCollapse: true,
    minLength: 2,
    zoom: 14,
    circleLocation:false
});

map.addControl(searchControl);

searchControl.on('search_locationfound', function(e) {
    L.circle([e.latlng.lat, e.latlng.lng], 1000, {fillOpacity:0.0,color:"#000000",opacity:.6}).addTo(map);
    L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
});