var q = require('q');
var _ = require('lodash');
var mongo = require('mongodb');
var ObjectID = require('mongodb').ObjectID;

var Utils = function(config) {
    //instantiation -- copying things like the mongoUri
    for (var prop in config){
        this[prop] = config[prop];
    }
};

Utils.prototype.connect = function(){
    var deferred = q.defer();
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect(this.mongoUri, {
        auto_reconnect : true
    }, function(err, database){
        if(err){deferred.resolve(new Error(error))}
        console.log("Connected to database...");
        deferred.resolve(database);
    });
    return deferred.promise;
};

Utils.prototype.query = function(query,projection,collection){
    var deferred = q.defer();
    this.connect()
        .then(function(db){
            var col = db.collection(collection)
            col.find(query,projection).toArray(function(error,results){
                if(error){deferred.reject(new Error(error));}
                else{deferred.resolve(results);}
            });
        });
    return deferred.promise;
};

Utils.prototype.findSites = function(site_ids){
    site_ids = _.map(site_ids,function(val){
       return new ObjectID(val);
    });
    var deferred = q.defer();
    this.connect()
        .then(function(db){
            var col = db.collection('sites');
            col.find({_id: {$in:site_ids}},{}).toArray(function(error,results){
                if(error){deferred.reject(new Error(error));}
                else{deferred.resolve(results);}
            });
        });
    return deferred.promise;
};

Utils.prototype.findGeo = function(collection,obj_ids){
    obj_ids = _.map(obj_ids,function(val){
        return new ObjectID(val);
    });
    var deferred = q.defer();
    this.connect()
        .then(function(db){
            var col = db.collection(collection);
            col.find({_id: {$in:obj_ids}},{}).toArray(function(error,results){
                if(error){deferred.reject(new Error(error));}
                else{deferred.resolve(results);}
            })
        })
    return deferred.promise;
};

module.exports = Utils;