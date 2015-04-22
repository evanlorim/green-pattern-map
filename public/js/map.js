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
    minZoom:11
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
$layers.default = L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 18,
    attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
$layers.normal = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/normal.day.grey/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', {
    attribution: 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
    subdomains: '1234',
    mapID: 'newest',
    app_id: 'Y8m9dK2brESDPGJPdrvs',
    app_code: 'dq2MYIvjAotR8tHvY8Q_Dg',
    base: 'base',
    minZoom: 0,
    maxZoom: 20
});


function addMap(){
    var map = L.map('map',
        {
            'center': [39.2854197594374, -76.61796569824219],
            'zoom' : 12,
            'layers':[$layers.default]
        }
    );
    var external = {};
    var svg;
    var watersheds, neighborhoods, csas;
    var search_circle, search_marker, search_exit;
    var cmos_icon =  L.AwesomeMarkers.icon({
        icon: 'users',
        prefix: 'fa',
        markerColor: 'orange'
    });
    var sw_icon = L.AwesomeMarkers.icon({
        icon: 'tint',
        prefix: 'fa',
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
    var address_search = new L.Control.Search({
        callData: googleGeocoding,
        filterJSON: filterJSONCall,
        autoType: false,
        autoCollapse: true,
        minLength: 2,
        zoom: 14,
        circleLocation:false
    });
    address_search.on('search_locationfound', function(e) {
        search_circle = L.circle([e.latlng.lat, e.latlng.lng], 1000, {fillOpacity:0.0,color:"#000000",opacity:.6});
        search_marker = L.marker([e.latlng.lat, e.latlng.lng]);
        search_exit = L.easyButton('fa-times',
        function(){
            map.removeLayer(search_circle);
            map.removeLayer(search_marker);
            map.removeControl(search_exit);
            update_sites();
            //map.removeLayer(search_exit);
        },
        'Clear search results...',''
        );
        map.addLayer(search_circle);
        map.addLayer(search_marker);
        map.addControl(search_exit);
        update_sites({lat: e.latlng.lat,lng: e.latlng.lng,km:1});
    });
    map.addControl(address_search);


    function updatePoints(sites){
        map.removeLayer(cmos_markers);
        map.removeLayer(sw_markers);
        cmos_markers.clearLayers();
        sw_markers.clearLayers();
        for(var i = 0; i < sites.length; i++){
            if(sites[i].properties.POINT_X){
                if(sites[i].properties.gpb_type == 'stormwater'){
                    var props = sites[i].properties;
                    var marker = L.marker([sites[i].properties.POINT_Y,sites[i].properties.POINT_X],{icon: sw_icon});
                    var html = "<h3>" + (props.site_name || "UNNAMED SITE") + "</h3></br>" +
                        "Location: " + (parseFloat(props.POINT_X).toFixed(6) + ", " + parseFloat(props.POINT_Y).toFixed(6) || 'NO DATA') + "</br>" +
                        "BMP Type: " + props.bmp_type + "</br>" +
                        "Status: " + (props.status || 'NO DATA') + "</br>" +
                        "Impervious Acres:" + (props.Imp_acres || 'NO DATA') + "</br>"
                        "Source: " + (props.source || 'NO DATA');
                    marker.bindPopup(html);
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
                    addLayersControl();
                }
        });
        function getWatersheds(cb){
            $.get('api/watersheds').success(function(data,status){
                watersheds = L.geoJson(data,{
                   style:{
                       fillColor:"#b3de69",
                       weight:2,
                       opacity:1,
                       color:'#67921D',
                       dashArray:3,
                       fillOpacity:0.30
                   }
                });
                cb();
            });
        }
        function getNeighborhoods(cb){
            $.get('api/neighborhoods').success(function(data,status){
                neighborhoods = L.geoJson(data,{
                    style:{
                        fillColor:"#d9d9d9",
                        weight:2,
                        opacity:1,
                        color:'#A6A6A6',
                        dashArray:3,
                        fillOpacity:0.30
                    }
                });
                cb();
            });
        }
        function getCsas(cb){
            $.get('api/csas').success(function(data,status){
                csas = L.geoJson(data,{
                    style:{
                        fillColor:"#fb8072",
                        weight:2,
                        opacity:1,
                        color:'#AF3426',
                        dashArray:3,
                        fillOpacity:0.30
                    }
                });
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
    function initVS(){
        getCSAS(after);
        function after(d,status){
            console.log(d);
            var bounds = d3.geo.bounds(d);
            var bl_bound = bounds[0];
            var tr_bound = bounds[1];
            var p1 = project(bounds[0]);
            svg = d3.select(map.getPanes().overlayPane).append('svg')
                .attr('id','map-svg')
                .style("opacity",1)
            var path_group = svg.append('g');

            var paths = path_group.selectAll('path')
                .data(d.features)
                .enter()
                .append('path');

            var path_tt = paths.append('svg:title')
                .text(function(d){
                    return d.properties.name;
                });

            resize();
            map.on('zoomend',resize);
            function resize(){
                var bl_proj = project(bl_bound);
                var tr_proj = project(tr_bound);
                console.log(bl_proj);
                console.log(tr_proj);
                var new_width = tr_proj[0] - bl_proj[0] + 'px';
                var new_height = bl_proj[1] - tr_proj[1] + 'px';
                var new_top = tr_proj[1] + 'px';
                var new_left = bl_proj[0] + 'px';
                svg.style('width', new_width);
                svg.style('height', new_height);
                svg.style('left',new_left);
                svg.style('top',new_top);


                paths.attr('d', d3.geo.path().projection(project));

                path_group.attr('transform', function(){
                   return "translate(" + -1*parseFloat(new_left) + "," + -1*parseFloat(new_top) + ")";
                });
            }
            external['display_vs'] = function(to_display,indicator){
                if(to_display == false){
                    svg.style('opacity',0);
                }
                else{
                    svg.style('opacity',1);
                    paths.style('fill',function(d){
                        var vsdata = d.properties.vsdata;
                        var chosen = vsdata[indicator];
                        if(chosen == null){
                            return('rgba(0,255,0,0)');
                        }
                        else{
                            console.log(chosen.break_color);
                            console.log(tinycolor(chosen.break_color).setAlpha(.6).toRgbString());
                            return(tinycolor(chosen.break_color).setAlpha(.6).toRgbString());
                        }
                    });
                    paths.style('stroke','white');
                    path_tt.text(function(d){
                        var vsdata = d.properties.vsdata;
                        var chosen = vsdata[indicator];
                        if(chosen == null){
                            return(d.properties.name);
                        }
                        else{
                            return(d.properties.name + ": " + chosen.value);
                        }

                    });
                    paths.on('mouseover',function(d){
                        d3.select(this).style('fill',function(d){
                            var vsdata = d.properties.vsdata;
                            var chosen = vsdata[indicator];
                            if(chosen == null){
                                return('rgba(0,255,0,0)');
                            }
                            else{
                                return(tinycolor(chosen.break_color).setAlpha(.6).spin(180).saturate(100).toRgbString());
                            }
                        });
                    });
                    paths.on('mouseout',function(d){
                        d3.select(this).style('fill',function(d){
                            var vsdata = d.properties.vsdata;
                            var chosen = vsdata[indicator];
                            if(chosen == null){
                                return('rgba(0,255,0,0)');
                            }
                            else{
                                return(tinycolor(chosen.break_color).setAlpha(.8).toRgbString());
                            }
                        });
                    });
                }
            }
        }
        function project(x){
            var point = map.latLngToLayerPoint(new L.LatLng(x[1],x[0]));

            return [point.x,point.y];
        }
    }
    function googleGeocoding(text, callResponse) {
        $geocoder.geocode({address: text}, callResponse);
    }
    function filterJSONCall(rawjson) {
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
    function getCSAS(callback){
        $.get('api/csas').success(function(data,status){callback(data,status);});
    }
    getLayers();
    initVS();
    external.updatePoints = updatePoints;
    return external;
}
