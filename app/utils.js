var mongo = require('mongodb');
var unique = require('array-unique');
var trim = require('trim');
var geolib = require('geolib');
var async = require('async');

var Utils = function(config) {
    for (var prop in config) this[prop] = config[prop];
};

Utils.prototype.connect = function(cb) {

    var MongoClient = require('mongodb').MongoClient;

    MongoClient.connect(this.mongoUri, {
        auto_reconnect: true
    }, function(err, db) {
        if (err) throw err;
        console.log("Connected to database");

        var col = db.collection('sites');
        col.ensureIndex({
            "geometry": "2dsphere"
        }, function() {
            console.log(arguments);
        });
        col.ensureIndex({
            "properties.site_name": "text",
            "properties.address": "text"
        }, function() {
            console.log(arguments);
        });
        cb(db);
    });

};

Utils.prototype.toGeoJson = function(data, query, collection) {

    var geo = [];
    for (var i = 0; i < data.length; i++) {
        var feature = {
            "type": "Feature",
            geometry: data[i].geometry,
            properties: {}
        };
        if (!data[i].properties) {
            for (prop in data[i]) {
                feature.properties[prop] = data[i][prop];
            }
        } else {
            feature.properties = data[i].properties;
        }
        geo.push(feature);
    }
    return {
        "type": "FeatureCollection",
        "features": geo,
        collection: collection,
        query: query
    };

};

Utils.prototype.toJson = function(data, query, collection) {
    return {
        data: data,
        results: data.length,
        collection: collection,
        query: query
    }
};

Utils.prototype.in_circle = function(center,km,resCb){
    var me = this;
    var m = km*1000;
    var res=[];
    this.connect(function(db){
        var col = db.collection('sites');
        col.find().toArray(function(err,results){
            if(err){console.log(err);}
            else{
                for(var i = 0; i < results.length; i++){
                    if(results[i].geometry === undefined){
                        continue;
                    }
                    else{
                        var latlng = {'latitude':results[i].geometry.coordinates[1],'longitude':results[i].geometry.coordinates[0]};
                        var incirc = geolib.isPointInCircle(latlng,center,m);
                        if(incirc){
                            res.push(results[i]);
                        }
                    }
                }
                var resp = me.toJson(res,{center:center,km:km},'sites');
                resCb(resp);
            }
        });
    });
};

Utils.prototype.query = function(res, collection, query, resultType, resCb) {
    var me = this;
    this.connect(function(db) {
        //console.log(arguments);
        var col = db.collection(collection);

        col.find(query).toArray(function(err, results) {
            console.log("query complete");
            if (err) {
                console.log(err);
                resCb({
                    status: 500,
                    data: [],
                    error: err
                });
            } else {
                if (resultType == 'geojson') {
                    var resp = me.toGeoJson(results, query, collection);
                }
                else {
                    var resp = me.toJson(results, query, collection);
                }
                resCb(resp);
            }
        });
    });
};

Utils.prototype.unique = function(res, collection, query, subquery, resultType, resCb, split){
    var me = this;
    this.connect(function(db) {
        var col = db.collection(collection);
        col.distinct(query, subquery, function (err, results) {
            console.log("query complete");
            if (err) {
                console.log(err);
                resCb({
                    status:500,
                    data: [],
                    error:err
                });
            }
            else {
                if (resultType == 'geojson') {
                    var resp = me.toGeoJson(results, query, subquery, collection);
                }
                else{
                    if(split == true){
                        var proc = [];
                        for(var i=0; i < results.length; i++){
                            proc.push(trim(results[i]));
                        }
                        proc = unique(proc);
                        results = proc;
                    }
                    var blank_index = results.indexOf('');
                    if(blank_index > -1){
                        results.splice(blank_index,1);
                    }
                    results.sort();
                    var resp = me.toJson(results, query, collection);
                }
                resCb(resp);
            }
        });
    });
};


Utils.prototype.aggregate = function(res, collection, query, resultType, resCb) {
    var me = this;
    this.connect(function(db) {
        //console.log(arguments);
        var col = db.collection(collection);

        col.aggregate(query, function(err, results) {
            console.log("query complete");
            if (err) {
                console.log(err);
                resCb({
                    status: 500,
                    data: [],
                    error: err
                });
            } else {
                if (resultType == 'geojson') {
                    var resp = me.toGeoJson(results, query, collection);
                } else {
                    var resp = me.toJson(results, query, collection);
                }
                resCb(resp);
            }
        });
    });
};

Utils.prototype.filter = function(res, collection, query, resultType, resCb){
    //var queries = query.queries;
    console.log(query);
    var me = this;
    this.connect(function(db){
        var col = db.collection(collection);

        var queue = [];
        var filtered = [];
        var filtered_ids = [];
        for(var i = 0; i < queries.length; i++){
            queue.push(queries[i]);
        }
        queue.push({'done':true});
        update(queue);
        function update(data){
            async.eachSeries(data,function(d,callback){
                if(d.done){
                    var resp = me.toJson(filtered, queries, collection);
                    console.log('done');
                    resCb(resp);
                    process.exit(0);
                    setImmediate(function(){
                        callback();
                    });
                }
                else{
                    col.find(query).toArray(function(err,results){
                        if(err) console.log(err);
                        else{
                            for(var i=0; i < results.length; i++){
                                if(filtered_ids.indexOf(results[i]._id) == -1){
                                    filtered.push(results[i]);
                                    filtered_ids.push(results[i]._id);
                                }
                            }
                        }
                        setImmediate(function(){callback();});
                    });
                }
            });
        }
    });

};


module.exports = Utils;