function googleGeocoding(text, callResponse)
{
    $geocoder.geocode({address: text}, callResponse);
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

function get_neighborhoods_layer(cb){
    $.get('api/geom_neighborhoods').success(function(data,status){
        layers['neighborhoods'] = data;
        cb();
    });
}

function get_csas_layer(cb){
    $.get('api/geom_csas').success(function(data,status){
        layers['csas'] = data;
        cb();
    });
}

function addPoints(sites){
    map.removeLayer(markers);
    markers.clearLayers();
    $current_points = [];
    for(var i = 0; i < sites.length; i++){
        if(sites[i].geometry){
            $current_points.push(sites[i]);
            var color;
            if(sites[i].properties.gpb_type == 'cmos'){
                color = "#FFFFFF";
            }
            else if(sites[i].properties.gpb_type == 'stormwater'){
                color = "#000000";
            }
            markers.addLayer(L.circleMarker([sites[i].geometry.coordinates[1],sites[i].geometry.coordinates[0]], {fillColor:color, radius:5, opacity:.8}));
        }
    }
    map.addLayer(markers);
}

function init(){
    async.parallel([
            get_points,
            get_neighborhoods_layer,
            get_csas_layer
        ],
        run
    );
}

var legend = L.control({position: 'bottomright'});
legend.onAdd = function(map){
    var div = L.DomUtil.create('div','info legend');
    div.innerHTML += "<This is a legend>"
    return div;
};
legend.addTo(map);
addPoints(points);

map.addControl(search_controls.address);

search_controls.address.on('search_locationfound', function(e) {
    L.circle([e.latlng.lat, e.latlng.lng], 1000, {fillOpacity:0.0,color:"#000000",opacity:.6}).addTo(map);
    L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
    $.get('api/sites_in_circle', {'center':{'latitude':e.latlng.lat, 'longitude':e.latlng.lng},km:1}).success(function(res,stat){
        var data = res.data;
        addPoints(data);
    });
});


search_controls.address = new L.Control.Search({
    callData: googleGeocoding,
    filterJSON: filterJSONCall,
    autoType: false,
    autoCollapse: true,
    minLength: 2,
    zoom: 14,
    circleLocation:false
});

markers = new L.FeatureGroup();


/*var canvas_container = d3.select(map.getPanes().overlayPane).append("div").attr("id","canvas-container"),
 leaflet_zoom_hide = canvas_container.append("div").attr("class", "canvas-leaflet-zoom-hide");*/

/*d3.json('public/etc/ex.json', function(collection) {
 //https://gist.github.com/mhkeller/5963329
 var bounds = d3.geo.bounds(collection);
 var path = d3.geo.path().projection(project);

 var feature = leaflet_zoom_hide.selectAll('div')
 .data(collection.features)
 .enter()
 .append("div")
 .attr("class","canvas-point-item");

 map.on("zoomstart", hideOverlay);
 map.on("zoomend", setOverlayContainerPosition);

 setOverlayContainerPosition();

 function hideOverlay(){
 leaflet_zoom_hide
 .style('visibility','hidden');
 }
 function showOverlay(){
 leaflet_zoom_hide
 .style('visibility','visible');
 // .style("transform", "translate(-" + bottomLeft[0] + "px,-" + topRight[1] + "px)");
 }

 function setOverlayContainerPosition() {
 var bottomLeft = project(bounds[0]),
 topRight = project(bounds[1]);

 canvas_container
 .style("width", topRight[0] - bottomLeft[0] + 'px')
 .style("height", bottomLeft[1] - topRight[1] + 'px')
 //.style("left", bottomLeft[0] + "px")
 //.style("top", topRight[1] + "px");

 // .style("left", bottomLeft[0] + "px")
 // .style("top", topRight[1] + "px");

 showOverlay();

 feature
 .style("top", function(d){ return (project(d.geometry.coordinates)[1] +'px') })
 .style("left", function(d){ return (project(d.geometry.coordinates)[0] +'px') })

 }

 function project(x) {
 var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
 return [point.x, point.y];
 }