//var $csas = get_csas();
//var $neighborhoods = get_neighborhoods();
//var $csas_layer = get_csas_layer();
//var $neighborhoods_layer = get_neighborhoods_layer();
var $geocoder = new google.maps.Geocoder();
var $current_points = [];
var $map;

function addMap(){
    var points = [];
    var layers = {};
    var search_controls = {};
    var map, cmos_marker, sw_marker,markers;

    init();

    function init(){
        async.parallel([
            get_points,
            get_neighborhoods_layer,
            get_csas_layer
        ],
            run
        );
    }

    function run(){
        map = L.map('map').setView([39.2854197594374, -76.61796569824219], 12);
        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18
        }).addTo(map);

        markers = new L.FeatureGroup();
/*        cmos_marker = L.AwesomeMarkers.icon({
            'prefix':'ion',
            'icon': 'ion-ios-flower-outline',
            'markerColor' : 'pink'
        });*/

/*        sw_marker = L.AwesomeMarkers.icon({
            'prefix':'ion',
            'icon': 'ion-ios-rainy-outline',
            'markerColor' : 'blue'
        });*/

        search_controls.address = new L.Control.Search({
            callData: googleGeocoding,
            filterJSON: filterJSONCall,
            autoType: false,
            autoCollapse: true,
            minLength: 2,
            zoom: 14,
            circleLocation:false
        });

        map.addControl(search_controls.address);

        search_controls.address.on('search_locationfound', function(e) {
            L.circle([e.latlng.lat, e.latlng.lng], 1000, {fillOpacity:0.0,color:"#000000",opacity:.6}).addTo(map);
            L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
            $.get('api/sites_in_circle', {'center':{'latitude':e.latlng.lat, 'longitude':e.latlng.lng},km:1}).success(function(res,stat){
                var data = res.data;
                addPoints(data);
            });
        });

        var sidebar = $('#sidebar').sidebar();
        var legend = L.control({position: 'bottomright'});
        legend.onAdd = function(map){
            var div = L.DomUtil.create('div','info legend');
            div.innerHTML += "<This is a legend>"
            return div;
        };
        legend.addTo(map);
        addPoints(points);
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

    function get_points(cb){
        $.get('api/unique_sites').success(function(data,status){
            points = data.features;
                cb();
        });
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
/*    map.neighborhoods = L.geoJson($neighborhoods_layer,{
        style:{
            fillColor: "#137B80",
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: 3,
            fillOpacity: 0.20
        }
    }).addTo(map);

    map.csas = L.geoJson($csas_layer,{
        style:{
            fillColor: "#555555",
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: 3,
            fillOpacity: 0.20
        }
    }).addTo(map);*/
    var ret = {};
    ret.add_points = addPoints;
    return ret;
}

function get_csas(){
    return JSON.parse(
        $.ajax({
            type: "GET",
            url:"api/csas?uniq=1"
        }).responseText
    ).data;
}

function get_csas_layer(){
    var res = null;
    $.ajax({
        type: "GET",
        url:"api/csas"
    }).success(function(data,status){
        res = data;
    });
    return res;
}

function get_neighborhoods(){
    return JSON.parse(
        $.ajax({
            type: "GET",
            url:"api/neighborhoods?uniq=1"
        }).responseText
    ).data;
}

function get_neighborhoods_layer(){
    var res = null;
    $.ajax({
            type: "GET",
            url:"api/neighborhoods"
        }).success(function(data,status){
        res = data;
    });
    return res;
}

function get_neighborhood_searchdata(){
    var mock_point = [39.2854197594374, -76.61796569824219]
    var formatted;
    $.ajax({
        type: "GET",
        url:"api/neighborhoods",
        async:"false"
    }).success(function(data,status){
        console.log(data);
        res = data;
        formatted = [];
        for(var i = 0; i < res.length; i++){
            formatted.push({'loc':mock_point,"title":res[i]});
        }
    });
    console.log(formatted);
    return formatted;
}

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

function filter_points(type,items){
    var prop;
    var new_points = [];
    if(type=='cmos_site_uses'){
        prop = 'site_use';
    }
    if(type=='cmos_orgs'){
        prop = 'organizations';
    }
    if(type=='sw_status'){
        prop = 'status';
    }
    for(var i=0; i < items.length; i++){
        for(var j=0; j < $current_points.length; j++){
            console.log($current_points[j].properties[prop]);
            if($current_points[j].properties[prop] == items[i]){

                new_points.push(current_points[j]);
            }
        }
    }
    $map.add_points(new_points);
}

function add_cmos_site_uses(){
    $.get('api/unique_cmos_site_uses').success(function(data,s){
        var sel = d3.select('#cmos')
            .append('select')
            .attr('id','cmos_site_uses')
            .attr('multiple','multiple');
        sel.selectAll('option')
            .data(data.data)
            .enter()
            .append('option')
            .attr('value',function(d){return d;})
            .text(function(d){return d;});
        $('#cmos_site_uses').multiselect({
            maxHeight: 200,
            nonSelectedText: 'Site Uses',
            includeSelectAllOption: true,
            onChange: function(option, checked, select) {
                if(checked){
                    filter_points('cmos_site_uses',$(option).val());
                }
            }
        });
    });
}

function add_cmos_orgs(){
    $.get('api/unique_cmos_orgs').success(function(data,s){
        var sel = d3.select('#cmos')
            .append('select')
            .attr('id','cmos_orgs')
            .attr('multiple','multiple');
        sel.selectAll('option')
            .data(data.data)
            .enter()
            .append('option')
            .attr('value',function(d){return d;})
            .text(function(d){return d;});
        $('#cmos_orgs').multiselect({
            maxHeight: 200,
            nonSelectedText: 'Organizations',
            includeSelectAllOption: true,
            onChange: function(option, checked, select) {
                if(checked){
                    filter_points('cmos_orgs',$(option).val());
                }
            }
        });
    });
}

function add_sw_status(){
    $.get('api/unique_sw_status').success(function(data,s){
        var sel = d3.select('#stormwater')
            .append('select')
            .attr('id','stormwater_status')
            .attr('multiple','multiple');
        sel.selectAll('option')
            .data(data.data)
            .enter()
            .append('option')
            .attr('value',function(d){return d;})
            .text(function(d){return d;});
        $('#stormwater_status').multiselect({
            maxHeight: 200,
            nonSelectedText: 'Status',
            includeSelectAllOption: true,
            onChange: function(option, checked, select) {
                if(checked){
                    filter_points('sw_status',$(option).val());
                }
            }
        });
    });
}