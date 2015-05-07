var mongo = require('mongodb');
var q = require('q');
var async = require('async-q');
var traverse = require('traverse');
var geolib = require('geolib');
var gju = require('geojson-utils');
var ss = require('simple-statistics');
var _ = require('lodash');

var Mask = function(options){
    var self = this;
    var deferred = q.defer();
    if(!options.uri){
        deferred.reject(new Error("No Mongo Uri Given"));
    }
    else{
        self.connect(options.uri)
            .then(function(db){
                self.db = db;
                self.access = db.collection('access');

                self.disconnect = function(){
                    console.log("Disconnected from database...");
                    db.close();
                };
                return(clearCollection(self.db,'access'));
            })
            .then(function(results){
                deferred.resolve(self);
            }).fail(function(error){deferred.reject(new Error(error));})
    }
    return deferred.promise;

    function clearCollection(db,name){
        //Just creating a clean database each time... can create update functions later...
        var deferred = q.defer();
        var col = db.collection(name);
        col.removeMany({},function(error,results){
            if(error){deferred.reject(error);}
            else{
                console.log("--Cleared <" + name + "> collection");
            }
            deferred.resolve(results);
        });
        return deferred.promise;
    }
};

Mask.prototype.connect = function(mongouri){
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



Mask.prototype.craftWatershedAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <watersheds> mask")
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'watersheds')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var info = _.transform(data,function(result,val){
                var obj = {title:val.id,obj_key:val._id,site_key:val.sites};
                result.push(obj);
            });
            var doc = {'id':'watersheds', info: info, geojson: geojson};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){
            console.log("--End crafting <watersheds> mask")
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftNeighborhoodAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <neighborhoods> mask")
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'neighborhoods')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var info = _.transform(data,function(result,val){
                var obj = {title:val.id,obj_key:val._id,site_key:val.sites};
                result.push(obj);
            });
            var doc = {'id':'neighborhoods', info: info, geojson: geojson};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){
            console.log("--End crafting <neighborhoods> mask")
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftCsaAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <csas> mask")
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'csas')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var info = _.transform(data,function(result,val){
                var obj = {title:val.id,obj_key:val._id,site_key:val.sites};
                result.push(obj);
            })
            var doc = {'id':'csas', info: info, geojson: geojson};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){
            console.log("--End crafting <csas> mask");
            deferred.resolve(results);
        });
    return deferred.promise;

};

Mask.prototype.craftCmosAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <cmos> mask");
    query(self.db,{'set':'cmos'},{'_id':1,'name':1,'uses':1},'sites')
        .then(function(data){
            var titles = _.transform(data,function(result,val){
                if(val.name){
                    var obj = {'title':val.name,'site_key':val._id}
                    result.push(obj);
                }
            });
            var uniq_uses = _.uniq(_.flatten(_.pluck(data,'uses')));
            var uses = _.reduce(uniq_uses,function(result,val){
                result[val] = [];
                return(result);
            },{});
            uses = _.reduce(data,function(result,val){
                if(val.uses){
                    _.forIn(val.uses,function(use){
                        result[use].push(val._id);
                    })
                }
                else if(val.uses == null){
                    result[null].push(val._id);
                }
                return result;
            },uses);
            uses = _.reduce(uses,function(result,val,key){
                var item = {'title':key,'site_key':val};
                result.push(item);
                return(result);
            },[]);

            var keys = _.pluck(data,'_id');
            var doc = {id:'cmos',titles:titles,uses:uses,site_key:keys};
            return(writeCollection(self.db,[doc],'access'));
        }).then(function(results){
            console.log("--End crafting <cmos> mask")
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftStormwaterAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <stormwater> mask")
    query(self.db,{'set':'stormwater'},{'_id':1,'status':1,'bmps':1},'sites')
        .then(function(data){
            var uniq_bmps = _.uniq(_.flatten(_.pluck(data,'bmps')));
            var bmps = _.reduce(uniq_bmps,function(result,val){
                result[val] = [];
                return(result);
            },{});

            bmps = _.reduce(data,function(result,val){
                if(val.bmps){
                    _.forIn(val.bmps,function(use){
                        result[use].push(val._id);
                    })
                }
                else if(val.bmps == null){
                    result[null].push(val._id);
                }
                return result;
            },bmps);
            bmps = _.reduce(bmps,function(result,val,key){
                var item = {'title':key,'site_key':val};
                result.push(item);
                return(result);
            },[]);

            var statuses = _.uniq(_.pluck(data,'status'));

            var statuses = _.reduce(statuses, function(result,val){
                result[val] = [];
                return(result);
            },{});

            statuses = _.reduce(data,function(result,val){
                if(val.status){
                        result[val.status].push(val._id);
                }
                else if(val.status == null){
                    result[null].push(val._id);
                }
                return result;
            },statuses);

            statuses = _.reduce(statuses,function(result, val, key){
                var item = {'title':key,'site_key':val};
                result.push(item);
                return result;
            },[]);

            var keys = _.pluck(data,'_id');

            var doc = {'id':'stormwater', statuses:statuses,bmps:bmps,site_key:keys};
            return(writeCollection(self.db,[doc],'access'))
        })
        .then(function(results){
            console.log("--End crafting <stormwater> mask")
            deferred.resolve(results);
        })

    return deferred.promise;
};

Mask.prototype.craftVitalSignsAccess = function(){
    var self = this;
    var deferred = q.defer();
    query(self.db,{},{'_id':1,'name':1,'section':1},'vs')
        .then(function(data){
            var titles = _.transform(data,function(result,val){
                if(val.name){
                    var obj = {'title':val.name,'site_key':val._id}
                    result.push(obj);
                }
            });
            var sections = _.uniq(_.pluck(data,'section'));



            var sections = _.reduce(sections, function(result,val){
                result[val] = [];
                return(result);
            },{});

            sections = _.reduce(data,function(result,val){
                if(val.section){
                    result[val.section].push(val._id);
                }
                else if(val.section == null){
                    result[null].push(val._id);
                }
                return result;
            },sections);

            sections = _.reduce(sections,function(result, val, key){
                var item = {'title':key,'site_key':val};
                result.push(item);
                return result;
            },[]);

            var doc = {'id':'vitalsigns',titles:titles,sections:sections};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){

        });
};

function writeCollection(db,documents,collection){
    var deferred = q.defer();
    var col = db.collection(collection);
    //chunking into 500s, to avoid write limit.
    var chunks = _.chunk(documents, 500);
    var chunk_funcs = _.map(chunks, function(chunk){
        return new insertChunk(chunk);
    });
    q.all(chunk_funcs).then(function(results){
        deferred.resolve(aggregate_results(results));
    },function(error){
        deferred.reject(error);
    });

    function insertChunk(chunk){
        var deferred = q.defer();
        col.insertMany(chunk,{w:1},function(error,results){
            if(error){deferred.reject(self.errorCheck(error));}
            else{
                deferred.resolve(results);
            }
        });
        return deferred.promise;
    }

    function aggregate_results(results){
        var report = {};
        report.count = _.sum(_.pluck(results,'insertedCount'));
        report.ops = _.flatten(_.pluck(results,'ops'));
        report.ids = _.flatten(_.pluck(results,'insertedIds'));
        return report;
    }

    return deferred.promise;
}

function query(db,query,projection,collection){
    var deferred = q.defer();
    var col = db.collection(collection);
    col.find(query,projection).toArray(function(error,results){
        if(error){deferred.reject(new Error(error));}
        else{deferred.resolve(results);}
    });
    return deferred.promise;
}

//assemble feature collection with ids, features, and _ids;
function assembleGeoJson(data){
    var fc = {'type': 'FeatureCollection'}
    fc.features = _.map(data,function(d){
        var feature = d.geo;
        feature.type = "Feature";
        feature.properties = {title: d.id,key: d._id};
        return feature;
    });
    return fc;
}





module.exports = Mask;