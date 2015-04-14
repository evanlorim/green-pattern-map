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

Utils.prototype.filterByRadius = function(center,km,sites){
    var m = km*1000;
    var res = [];
    for (var key in sites){
        if(sites[key].geometry === undefined){
            continue;
        }
        else{
            var latlng = {'latitude':sites[key].geometry.coordinates[1],'longitude':sites[key].geometry.coordinates[0]};
            if(geolib.isPointInCircle(latlng,center,m)){
                res.push(sites[key]);
            }
        }
    }
    return res;
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

Utils.prototype.filterz = function(res, collection, query, resultType, resCb, opts){
    var me = this;
    this.connect(function(db){
        var col = db.collection(collection);
        var found = {};
        var funcs = [];
        for(var i = 0; i < query.length; i++){
            var q = query[i];
            funcs[i] = function(cb){append_found(q,cb);}
        }
        async.parallel(funcs,finish);

        function append_found(q,cb){
            console.log(q);
            col.find(q).toArray(function(err,results){
                if(err){console.log(err);}
                else{
                    console.log("LENGTH" + results.length);
                    for(var i = 0 ; i < results.length ; i++ ){
                        var id = results[i]._id;
                        if(found[id]){
                            continue;
                        }
                        found[id] = results[i];
                    }
                    cb();
                }
            });
        }
        function finish(err,results){
            if(err){
                console.log(err);
            }
            else{
                var answer = [];
                if(opts && opts['inradius']){
                    console.log(opts.inradius);
                    answer = me.filterByRadius(opts.inradius.center,opts.inradius.radius,found);
                }
                else{
                    for(var key in found){
                        answer.push(found[key]);
                    }
                }
                if (resultType == 'geojson') {
                    var resp = me.toGeoJson(answer, query, collection);
                } else {
                    var resp = me.toJson(answer, query, collection);
                }
                resCb(resp);

            }
        }
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

module.exports = Utils;