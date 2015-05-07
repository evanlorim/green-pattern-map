var mongo = require('mongodb');
var q = require('q');
var async = require('async-q');
var traverse = require('traverse');
var geolib = require('geolib');
var gju = require('geojson-utils');
var ss = require('simple-statistics');
var _ = require('lodash');

var Aggregate = function(options){
    var self = this;
    var deferred = q.defer();
    if(!options.uri){
        deferred.reject(new Error("No Mongo Uri Given"));
    }
    else{
        self.connect(options.uri)
            .then(function(db){
                self.db = db;
                self.disconnect = function(){
                    console.log("Disconnected from database...");
                    db.close();
                };
                deferred.resolve(self);
            },function(error){
                deferred.reject(new Error(error));
            });
    }
    return deferred.promise;
};

Aggregate.prototype.connect = function(mongouri){
    var deferred = q.defer();
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect(mongouri, {
        auto_reconnect : true
    }, function(error, db){
        if(error){deferred.reject(error);}
        else{
            console.log("Connected to database...");
            deferred.resolve(db);
        }
    });
    return deferred.promise;
};

Aggregate.prototype.assignWatershedsSites = function(){
    var self = this;
    var deferred = q.defer();
    console.log("Begin assigning <sites> to <watersheds>");
    q.all([findAll(self.db,'sites'), findAll(self.db,'watersheds')])
        .spread(function(sites,watersheds){
            watersheds = _.map(watersheds,function(ws){
                ws.sites = _.reduce(sites,function(results,site){
                    var in_ws = inGeometry(site.coordinates,ws.geo.geometry);
                    if(in_ws){results.push(site._id);}
                    return results;
                },[]);
                return ws;
            });
            return(replaceDocuments(self.db,'watersheds',watersheds));
        })
        .then(function(results){
            console.log("End assigning <sites> to <watersheds>");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
};

Aggregate.prototype.assignNeighborhoodsSites = function(){
    var self = this;
    var deferred = q.defer();
    console.log("Begin assigning <sites> to <neighborhoods>");
    q.all([findAll(self.db,'sites'), findAll(self.db,'neighborhoods')])
        .spread(function(sites,neighborhoods){
            neighborhoods = _.map(neighborhoods,function(ws){
                ws.sites = _.reduce(sites,function(results,site){
                    var in_ws = inGeometry(site.coordinates,ws.geo.geometry);
                    if(in_ws){results.push(site._id);}
                    return results;
                },[]);
                return ws;
            });
            return(replaceDocuments(self.db,'neighborhoods',neighborhoods));
        })
        .then(function(results){
            console.log("End assigning <sites> to <neighborhoods>");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;

};

Aggregate.prototype.assignCsasSites = function(){
    var self = this;
    var deferred = q.defer();
    console.log("Begin assigning <sites> to <csas>");
    q.all([findAll(self.db,'sites'), findAll(self.db,'csas')])
        .spread(function(sites,csas){
            csas = _.map(csas,function(ws){
                ws.sites = _.reduce(sites,function(results,site){
                    var in_ws = inGeometry(site.coordinates,ws.geo.geometry);
                    if(in_ws){results.push(site._id);}
                    return results;
                },[]);
                return ws;
            });
            return(replaceDocuments(self.db,'csas',csas));
        })
        .then(function(results){
            console.log("End assigning <sites> to <csas>");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
};


function findAll(db,collection){
    var deferred = q.defer();
    var col = db.collection(collection);

    col.find({}).toArray(function(error,results){
        if(error){deferred.reject(new Error(error));}
        else{deferred.resolve(results);}
    });

    console.log("--Retrieved <" + collection + "> documents");
    return deferred.promise;
}

//uses _id parameter to replace docs
function replaceDocuments(db,collection,docs){
    var self = this;
    self.deferred = q.defer();
    self.counter = 0;
    self.max = docs.length;
    self.collection = collection;
    self.col = db.collection(collection);

    var Updater = function(doc){
        function updateDoc(){
            var deferred = q.defer();
            self.col.updateOne({_id:doc['_id']},doc,function(error,results){
                if(error){deferred.reject(error);}
                else{
                    self.counter = self.counter+1;
                    console.log((self.counter) + "/" + (self.max) + " <" + self.collection + "> documents...")
                    deferred.resolve(results);
                }
            });
            return deferred.promise;
        }

        return updateDoc;
    };

    console.log("--Begin updating "  + docs.length + " <" +collection+ "> documents");
    var funcs = _.reduce(docs,function(results,doc){
        var u = new Updater(doc);
        results.push(u());
        return results;
    },[]);
    q.all(funcs)
        .then(function(results){
            results = aggregate_results(results);
            console.log("--End updating <" +collection+ "> documents");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(error);
        });


    return deferred.promise;

    function aggregate_results(results){
        var report = {};
        report.match_count = _.sum(_.pluck(results,'matchedCount'));
        report.mod_count = _.sum(_.pluck(results,'modifiedCount'));
        return report;
    }
}

function inGeometry(latlng,geometry){
    var point = {"type":"Point",'coordinates':latlng};
    if(geometry.type == 'Polygon'){
        return(gju.pointInPolygon(point,geometry));
    }
    if(geometry.type == 'MultiPolygon'){
        return(gju.pointInMultiPolygon(point,geometry));
    }
    else{
        throw(new Error("Unsupported geometry type"));
    }
}


module.exports = Aggregate;