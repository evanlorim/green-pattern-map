var $layers = {};
var $overlays = {};
var $map;
$layers.osm_mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    minZoom:12
});
$layers.osm_bw = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    minZoom:2
});
$layers.tf_od = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    minZoom:12
});
$layers.print = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 18,
    minZoom:12,
    ext: 'png'
});
$layers.esri = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 18,
    minZoom:12
});
$layers.cb_dark = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    minZoom:12,
    maxZoom: 18
});
$layers.cb_dark_nolab = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    minZoom:12,
    maxZoom: 18
});
$overlays.labels = L.tileLayer('http://a{s}.acetate.geoiq.com/tiles/acetate-labels/{z}/{x}/{y}.png', {
    attribution: '&copy;2012 Esri & Stamen, Data from OSM and Natural Earth',
    subdomains: '0123',
    minZoom:12,
    maxZoom: 18
});
$overlays.roads = L.tileLayer('http://a{s}.acetate.geoiq.com/tiles/acetate-roads/{z}/{x}/{y}.png', {
    attribution: '&copy;2012 Esri & Stamen, Data from OSM and Natural Earth',
    subdomains: '0123',
    minZoom: 12,
    maxZoom: 18
});



function addMap(){
    var map = L.map('map',
        {
            'center': [39.2854197594374, -76.61796569824219],
            'zoom' : 12,
            'layers':[$layers.osm_bw]
        }
    );
    var markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false,
        zoomToBoundsOnClick:false,
        animateAddingMarkers:true,
        maxClusterRadius:40,
        disableClusteringAtZoom:16
    });
    map.addLayer(markers);
    var sidebar = $('#sidebar').sidebar();


    function updatePoints(sites){
        map.removeLayer(markers);
        console.log('updating...');
        markers.clearLayers();
        for(var i = 0; i < sites.length; i++){
            if(sites[i].properties.POINT_X){
                var marker = L.marker([sites[i].properties.POINT_Y,sites[i].properties.POINT_X]);
                markers.addLayer(marker);
            }
        }
        map.addLayer(markers);
    }




    var ret = {};
    ret.updatePoints = updatePoints;
    return ret;
}

var ex = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [39.299294, -76.631558]}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [39.298359, -76.625734]}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [39.292043, -76.618341]}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [39.282014, -76.629026]}
        }
    ]
};