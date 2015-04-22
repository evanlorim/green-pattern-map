function DataLibrary(options){
    var tile_layers = {}; //background layers
    var geo_layers = {}; //geographic layers -- csas, neighborhoods, and watersheds
    var external = {}; //what is returned, accessor/ mutator functions, etc.
    this.retrieveVitalSignsIndicatorDataPromise().then(function(d){
        console.log(d);
    });
    function retrieveResources(){
        var done = Q.defer();
        function getTileLayers(){
            tile_layers.default = L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
                minZoom: 0,
                maxZoom: 18,
                attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            });

            tile_layers.terrain = L.tileLayer('http://{s}.tile.stamen.com/terrain-background/{z}/{x}/{y}.{ext}', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                minZoom: 4,
                maxZoom: 18,
                ext: 'png',
                bounds: [[22, -132], [70, -56]]
            });

            tile_layers.satelite = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });

            tile_layers.printfriendly = L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.{ext}', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                minZoom: 0,
                maxZoom: 20,
                ext: 'png'
            });
        }
    }
    return external;
}


DataLibrary.prototype.retrieveWatershedsUniquePromise = function(){
    var deferred = Q.defer();
    $.get('api/unique_watersheds').success(function(data,status){
        deferred.resolve(data.data);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveWatershedsGeoPromise = function(){
    var deferred = Q.defer();
    $.get('api/watersheds').success(function(data,status){
        var fc = {};
        fc.type = "FeatureCollection";
        fc.features = [];
        var features = data.features;
        for(var i = 0; i < features.length; i++){
            if(features[i].properties.MDE8NAME && features[i].geometry){
                var id = features[i].properties.MDE8NAME;
                var geom = features[i].geometry;
                fc.features[i] = {};
                fc.features[i].type = 'feature';
                fc.features[i].properties = {};
                fc.features[i].properties.id = id;
                fc.features[i].geometry = geom;
            }
        }
        deferred.resolve(fc);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveNeighborhoodsGeoPromise = function(){
    var deferred = Q.defer();
    $.get('api/neighborhoods').success(function(data,status){
        var fc = {};
        fc.type = "FeatureCollection";
        fc.features = [];
        var features = data.features;
        for(var i = 0; i < features.length; i++){
            if(features[i].properties.Name && features[i].geometry){
                var id = features[i].properties.Name;
                var geom = features[i].geometry;
                fc.features[i] = {};
                fc.features[i].type = 'feature';
                fc.features[i].properties = {};
                fc.features[i].properties.id = id;
                fc.features[i].geometry = geom;
            }
        }
        deferred.resolve(fc);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveNeighborhoodsUniquePromise = function(){
    var deferred = Q.defer();
    $.get('api/unique_neighborhoods').success(function(data,status){
        deferred.resolve(data.data);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveCsasGeoPromise = function(){
    var deferred = Q.defer();
    $.get('api/csas').success(function(data,status){
        var fc = {};
        fc.type = "FeatureCollection";
        fc.features = [];
        var features = data.features;
        for(var i = 0; i < features.length; i++){
            if(features[i].properties.name && features[i].geometry){
                var id = features[i].properties.name;
                var geom = features[i].geometry;
                fc.features[i] = {};
                fc.features[i].type = 'feature';
                fc.features[i].properties = {};
                fc.features[i].properties.id = id;
                fc.features[i].geometry = geom;
            }
        }
        deferred.resolve(fc);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveCsasUniquePromise = function(){
    var deferred = Q.defer();
    $.get('api/unique_csas').success(function(data,status){
        deferred.resolve(data.data);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveVitalSignsDataPromise = function(){
    var deferred = Q.defer();
    $.get('api/csas').success(function(data,status){
        var dict = {};
        var features= data.features;
        for(var i = 0; i < features.length; i++){
            if(features[i].properties.name){
                var id = features[i].properties.name;
                dict[id] = features[i].properties.vsdata;
            }
        }
        deferred.resolve(dict);
    });
    return deferred.promise;
};

DataLibrary.prototype.retrieveVitalSignsIndicatorDataPromise = function(){
    var deferred = Q.defer();
    $.get('api/indicator_info').success(function(data,status){
        var dict = {};
        for(var i = 0; i < data.length; i++){

        }
    });
    return deferred.promise;
};