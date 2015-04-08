//var $csas = get_csas();
//var $neighborhoods = get_neighborhoods();
//var $csas_layer = get_csas_layer();
//var $neighborhoods_layer = get_neighborhoods_layer();
var $geocoder = new google.maps.Geocoder();

function addMap(){
    var points = [];
    var layers = {};
    var search_controls = {};
    var map, cmos_marker, sw_marker;

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
        cmos_marker = L.AwesomeMarkers.icon({
            'prefix':'ion',
            'icon': 'ion-ios-flower-outline',
            'markerColor' : 'pink'
        });

        sw_marker = L.AwesomeMarkers.icon({
            'prefix':'ion',
            'icon': 'ion-ios-rainy-outline',
            'markerColor' : 'blue'
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

        map.addControl(search_controls.address);

        search_controls.address.on('search_locationfound', function(e) {
            L.circle([e.latlng.lat, e.latlng.lng], 1000, {fillOpacity:0.0,color:"#000000",opacity:.6}).addTo(map);
            L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
            $.get('api/sites_in_circle', {'center':{'latitude':e.latlng.lat, 'longitude':e.latlng.lng},km:1}).success(function(res,stat){
                var data = res.data;
                addPoints(data);
            });
        });

        addPoints(points);
    }

    function addPoints(sites){
        for(var i = 0; i < sites.length; i++){
            if(sites[i].geometry){
                var marker;
                if(sites[i].properties.gpb_type == 'cmos'){
                    marker = cmos_marker;
                }
                else if(sites[i].properties.gpb_type == 'stormwater'){
                    marker = sw_marker;
                }
                L.marker([sites[i].geometry.coordinates[1],sites[i].geometry.coordinates[0]], {icon:marker}).addTo(map);
            }
        }
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