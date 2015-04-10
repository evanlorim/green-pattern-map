var $layers = {};
var $overlays = {};
var $map;
$layers.osm_mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:20,
    minZoom:12
});
$layers.osm_bw = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:20,
    minZoom:12
});
$layers.tf_od = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:20,
    minZoom:12
});
$layers.print = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom:20,
    minZoom:12,
    ext: 'png'
});
$layers.esri = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom:20,
    minZoom:12
});
$layers.cb_dark = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    minZoom:12,
    maxZoom:20
});
$layers.cb_dark_nolab = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    minZoom:12,
    maxZoom:20
});
$overlays.labels = L.tileLayer('http://a{s}.acetate.geoiq.com/tiles/acetate-labels/{z}/{x}/{y}.png', {
    attribution: '&copy;2012 Esri & Stamen, Data from OSM and Natural Earth',
    subdomains: '0123',
    minZoom:12,
    maxZoom:20
});
$overlays.roads = L.tileLayer('http://a{s}.acetate.geoiq.com/tiles/acetate-roads/{z}/{x}/{y}.png', {
    attribution: '&copy;2012 Esri & Stamen, Data from OSM and Natural Earth',
    subdomains: '0123',
    minZoom: 12,
    maxZoom:20
});



function addMap(){
    var map = L.map('map',
        {
            'center': [39.2854197594374, -76.61796569824219],
            'zoom' : 12,
            'layers':[$layers.osm_bw]
        }
    );
    var watersheds, neighborhoods, csas;
    var cmos_icon =  L.AwesomeMarkers.icon({
        icon: 'grain',
        prefix: 'glyphicon',
        markerColor: 'orange'
    });
    var sw_icon = L.AwesomeMarkers.icon({
        icon: 'cloud',
        prefix: 'glyphicon',
        markerColor: 'cadetblue'
    });
    var cmos_markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false,
        zoomToBoundsOnClick:false,
        animateAddingMarkers:true,
        maxClusterRadius:40,
        disableClusteringAtZoom:16,
        iconCreateFunction: function (t) {
            var e = t.getChildCount(), i = " marker-cluster-";
            console.log(e);
            if(10 > e){i=" marker-cluster-small cmos-marker-cluster-small"}
            else if(100 > e){i=" marker-cluster-medium cmos-marker-cluster-medium"}
            else if(e > 100){i=" marker-cluster-large cmos-marker-cluster-large"}
            return new L.DivIcon({
                html: "<div><span>" + e + "</span></div>",
                className: "marker-cluster" + i,
                iconSize: new L.Point(40, 40)
            });
        }
    });
    var sw_markers = new L.markerClusterGroup({
        showCoverageOnHover:false,
        zoomToBoundsOnClick:false,
        animateAddingMarkers:true,
        maxClusterRadius:40,
        disableClusteringAtZoom:16,
        iconCreateFunction: function (t) {
            var e = t.getChildCount(), i = " marker-cluster-";
            if(10 > e){i=" marker-cluster-small sw-marker-cluster-small"}
            else if(100 > e){i=" marker-cluster-medium sw-marker-cluster-medium"}
            else if(e > 100){i=" marker-cluster-large sw-marker-cluster-large"}
            return new L.DivIcon({
                html: "<div><span>" + e + "</span></div>",
                className: "marker-cluster" + i,
                iconSize: new L.Point(40, 40)
            });
        }
    });
    map.addLayer(cmos_markers);
    map.addLayer(sw_markers);
    var sidebar = $('#sidebar').sidebar();


    function updatePoints(sites){
        map.removeLayer(cmos_markers);
        map.removeLayer(sw_markers);
        cmos_markers.clearLayers();
        sw_markers.clearLayers();
        for(var i = 0; i < sites.length; i++){
            if(sites[i].properties.POINT_X){
                if(sites[i].properties.gpb_type == 'stormwater'){
                    var marker = L.marker([sites[i].properties.POINT_Y,sites[i].properties.POINT_X],{icon: sw_icon});
                    sw_markers.addLayer(marker);
                }
                else if(sites[i].properties.gpb_type == 'cmos'){
                    var marker = L.marker([sites[i].properties.POINT_Y,sites[i].properties.POINT_X],{icon: cmos_icon});
                    cmos_markers.addLayer(marker);
                }
            }
        }
        map.addLayer(cmos_markers);
        map.addLayer(sw_markers);
    }
    function getLayers(){
        async.parallel([
            getWatersheds,
            getNeighborhoods,
            getCsas
        ],
        function(err,res){
            if(err){console.log(err);}
            else{
                    console.log("No error");
                    addLayersControl();
                }
        });
        function getWatersheds(cb){
            $.get('api/watersheds').success(function(data,status){
                watersheds = L.geoJson(data,{
                   style:{
                       fillColor:"#FFFFFF",
                       weight:2,
                       opacity:1,
                       color:'white',
                       dashArray:3,
                       fillOpacity:0.20
                   }
                });
                console.log("GOT WS");
                cb();
            });
        }
        function getNeighborhoods(cb){
            $.get('api/neighborhoods').success(function(data,status){
                neighborhoods = L.geoJson(data,{
                    style:{
                        fillColor:"#AAAAAA",
                        weight:2,
                        opacity:1,
                        color:'white',
                        dashArray:3,
                        fillOpacity:0.20
                    }
                });
                cb();
            });
        }
        function getCsas(cb){
            $.get('api/csas').success(function(data,status){
                csas = L.geoJson(data,{
                    style:{
                        fillColor:"#000000",
                        weight:2,
                        opacity:1,
                        color:'white',
                        dashArray:3,
                        fillOpacity:0.20
                    }
                });
                console.log("made it this far...");
                cb();
            });
        }
        function addLayersControl(){
            L.control.layers(null, {
                "Watersheds": watersheds,
                "Neighborhoods": neighborhoods,
                "Community Statistical Areas": csas
            }).addTo(map);
        }
    }
    getLayers();
    var ret = {};
    ret.updatePoints = updatePoints;
    return ret;
}
