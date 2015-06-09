//mask data
var mongo = require('mongodb');
var q = require('q');
var async = require('async-q');
var traverse = require('traverse');
var geolib = require('geolib');
var gju = require('geojson-utils');
var ss = require('simple-statistics');
var uc = require('unique-colors');
var numeral = require('numeral');
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
                return(clearCollection(self.db,'access_selectors'));
            })
            .then(function(results){
                deferred.resolve(self);
            }).fail(function(error){deferred.reject(new Error(error));});
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

Mask.prototype.craftSelectors = function(){
    var self = this;
    var deferrd = q.defer();
    console.log("--Begin craftin <selectors> mask")
    query(self.db,{},{},'access')
        .then(function(data){
            var selectors = _.map(data,function(d){
                var obj = {}
                obj.id = d.id;
                obj.pretty_name = d.pretty_name;
                obj.type = d.type;
                if(d.meta && d.meta.set){
                    obj.set = d.meta.set
                }
                else{d.meta.set = null;}
                var mutable = {};
                _.forIn(d.filterable,function(filter){
                    mutable[filter.name] = {options:[],select_all:false};
                    _.forIn(d.info[filter.name],function(opt){
                        mutable[filter.name].options.push({title:opt.title,active:false});
                    });
                });
                obj.mutable = mutable;
                console.log(obj.mutable);
                return obj;
            });
            console.log(selectors);
            return writeCollection(self.db,selectors,'access_selectors');
        }).then(function(results){
            console.log("--End crafting <selectors> mask");
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftWatershedAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <watersheds> mask");
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'watersheds')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var geo_doc_ids = _.map(geojson.features,function(f){
                return f.properties.geo_doc_id;
            });
            var titles = _.transform(data,function(result,val){
                var obj = {title:val.id,geo_doc_id:val._id,site_doc_ids:val.sites};
                result.push(obj);
            });

            
            var site_doc_ids = _.map(titles,function(t){
                return t.site_doc_ids;
            });
            site_doc_ids = _.unique(_.flatten(site_doc_ids));
            var info = {titles:titles};
            var filterable = [{name:'titles',pretty_name:'Watershed Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var searchable = [{name:'titles',pretty_name:'Watershed Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var doc = {'id':'watersheds',pretty_name:'Watersheds',type:'geo', info: info, filterable:filterable, searchable:searchable, geo_doc_ids: geo_doc_ids,site_doc_ids:site_doc_ids,meta:{set:'standard_geo'}};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){
            console.log("--End crafting <watersheds> mask");
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftNeighborhoodAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <neighborhoods> mask");
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'neighborhoods')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var geo_doc_ids = _.map(geojson.features,function(f){
                return f.properties.geo_doc_id;
            });
            var titles = _.transform(data,function(result,val){
                var obj = {title:val.id,geo_doc_id:val._id,site_doc_ids:val.sites};
                result.push(obj);
            });

            titles = reSort(titles,'title');

            var site_doc_ids = _.map(titles,function(t){
                return t.site_doc_ids;
            });
            site_doc_ids = _.unique(_.flatten(site_doc_ids));

            var info = {titles:titles};
            var filterable = [{name:'titles',pretty_name:'Neighborhood Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var searchable = [{name:'titles',pretty_name:'Neighborhood Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var doc = {'id':'neighborhoods',pretty_name: "Neighborhoods",type:'geo', info: info,filterable:filterable,searchable:searchable,geo_doc_ids:geo_doc_ids,site_doc_ids:site_doc_ids,meta:{set:'standard_geo'}};
            return(writeCollection(self.db,[doc],'access'));
        })
        .then(function(results){
            console.log("--End crafting <neighborhoods> mask");
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftCsaAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <csas> mask");
    query(self.db,{},{_id:1,id:1,geo:1,'sites':1},'csas')
        .then(function(data){
            var geojson = assembleGeoJson(data);
            var geo_doc_ids = _.map(geojson.features,function(f){
                return f.properties.geo_doc_id;
            });
            var titles = _.transform(data,function(result,val){
                var obj = {title:val.id,geo_doc_id:val._id,site_doc_ids:val.sites};
                result.push(obj);
            });

            titles = reSort(titles,'title');

            var site_doc_ids = _.map(titles,function(t){
                return t.site_doc_ids;
            });
            site_doc_ids = _.unique(_.flatten(site_doc_ids));
            var info = {titles:titles};
            var filterable = [{name:'titles',pretty_name:'Community Statistical Area Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var searchable = [{name:'titles',pretty_name:'Community Statistical Area Names',exchange_with:['site_doc_ids','geo_doc_id']}];
            var doc = {'id':'csas',pretty_name:"Community Statistical Areas",type:'geo',info: info, filterable:filterable,searchable:searchable,geo_doc_ids:geo_doc_ids,site_doc_ids:site_doc_ids,meta:{set:'standard_geo'}};
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
                    var obj = {'title':val.name,'site_doc_id':val._id};
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
                    });
                }
                else if(val.uses === null){
                    result[null].push(val._id);
                }
                return result;
            },uses);
            uses = _.reduce(uses,function(result,val,key){
                var item = {'title':key,'site_doc_ids':val};
                result.push(item);
                return(result);
            },[]);

            uses = reSort(uses,'title');

            uses = assignColors(uses);

            var keys = _.pluck(data,'_id');
            var info = {titles:titles,uses:uses};
            var filterable = [{name:'uses',pretty_name:'Site Uses',exchange_with:['site_doc_ids'],attributes:['color']}];
            var searchable = [{name:'titles',pretty_name:'Site Names',exchange_with:['site_doc_id'],attributes:[]}];
            var doc = {id:'cmos', pretty_name: 'Community Managed Open Spaces',type:'sites',info:info,filterable:filterable,searchable:searchable,site_doc_ids:keys,meta:{}};
            return(writeCollection(self.db,[doc],'access'));
        }).then(function(results){
            console.log("--End crafting <cmos> mask");
            deferred.resolve(results);
        });
    return deferred.promise;
};

Mask.prototype.craftStormwaterAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <stormwater> mask");
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
                    });
                }
                else if(val.bmps === null){
                    result[null].push(val._id);
                }
                return result;
            },bmps);
            bmps = _.reduce(bmps,function(result,val,key){
                var item = {'title':key,'site_doc_ids':val};
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
                var item = {'title':key,'site_doc_ids':val};
                result.push(item);
                return result;
            },[]);

            statuses = reSort(statuses,'title');
            bmps = reSort(bmps,'title');

            statuses = assignColors(statuses);
            bmps = assignColors(bmps);

            var keys = _.pluck(data,'_id');
            var info = {statuses:statuses,bmps:bmps};
            var filterable = [
                {name:'bmps',pretty_name:'Best Management Practices',exchange_with:['site_doc_ids'],attributes:['color']},
                {name:'statuses',pretty_name:'Site Status',exchange_with:['site_doc_ids'],attributes:['color']}
            ];
            var searchable = [];
            var doc = {'id':'stormwater',pretty_name:'Stormwater Management Sites',type:'sites',info:info,filterable:filterable,searchable:searchable,site_doc_ids:keys, meta:{}};
            return(writeCollection(self.db,[doc],'access'))
        })
        .then(function(results){
            console.log("--End crafting <stormwater> mask")
            deferred.resolve(results);
        });

    return deferred.promise;
};

Mask.prototype.craftVitalSignsAccess = function(){
    var self = this;
    var deferred = q.defer();
    console.log("--Begin crafting <vital signs> mask")
    query(self.db,{},{'_id':1,'id':1,'name':1,'section':1,'stats':1,'intervals':1,'colors':1},'vs')
        .then(function(indicators){
            self.indicators = indicators;
            return(query(self.db,{},{},'vs_csas'))
        })
        .then(function(vs_csas){
            var counter = 0;
            var docs = _.reduce(self.indicators,function(results,ind){
                counter+=1;
                console.log("--" + counter);
                var doc = {};
                doc.id = ind.id;
                doc.pretty_name = ind.name;
                doc.type = 'geo';
                doc.meta = {};
                doc.meta.set = 'vs_geo';
                doc.meta.section = ind.section;
                doc.meta.intervals = ind.intervals;
                doc.meta.colors = ind.colors;
                doc.meta.stats = ind.stats;
                var vs = _.filter(vs_csas,_.matchesProperty('geo.properties.indicator_id',ind.name));
                doc.info = {}
                doc.info.titles = _.map(vs,function(v){
                    var inf = {};
                    inf.title = v.id;
                    inf.geo_doc_id = v._id;
                    inf.site_doc_ids = v.sites;
                    //inf.interval = v.geo.properties.interval;
                    return inf;
                });
                doc.geo_doc_ids = _.map(doc.info.titles,function(t){
                    return t.geo_doc_id;
                });
                var site_doc_ids = _.map(doc.info.titles,function(t){
                    return t.site_doc_ids;
                });
                doc.site_doc_ids = _.unique(_.flatten(site_doc_ids));
                doc.info.intervals = [];
                for(var i = 0; i < 5; i++){
                    var interval = ind.intervals[i];
                    var inf = {};
                    inf.interval = i;
                    inf.title = numeral(interval[0]).format('0,0.[00]') + " - " + numeral(interval[1]).format('0,0.[00]');
                    var in_interval = _.filter(vs, _.matchesProperty('geo.properties.interval',i));
                    inf.geo_doc_ids = _.pluck(in_interval,'_id');
                    inf.site_doc_ids = _.unique(_.flatten(_.pluck(in_interval,'sites')));
                    doc.info.intervals.push(inf);
                }
                doc.filterable = [
                    {'name':'titles','pretty_name':'Community Statistical Area Name','exchange_with':['site_doc_ids','geo_doc_id']},
                    {'name':'intervals','pretty_name':'In Interval','exchange_with':['site_doc_ids','geo_doc_ids']}
                ];
                doc.searchable = [{name:'titles',pretty_name:'Community Statistical Area Names',exchange_with:['site_doc_ids','geo_doc_id']}];
                results.push(doc);
                return results;
            },[]);
        return writeCollection(self.db,docs,'access');
        })
        .then(function(results){
            console.log("--End crafting <vital signs> mask")
            deferred.resolve(results);
        });
    return deferred.promise;
};

function assignColors(obj_arr){
    var result = _.clone(obj_arr);
    var n = obj_arr.length;
    var colors = uc.unique_colors(n);
    _.forIn(_.range(n),function(i){
        result[i].color = colors[i];
    });
    return result;
}

function writeCollection(db,documents,collection){
    var self = this;
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
            if(error){deferred.reject(error); console.log(error);}
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
    var fc = {'type': 'FeatureCollection'};
    console.log('--begin assembling geojson');
    fc.features = _.map(data,function(d){
        var feature = d.geo;
        feature.type = "Feature";
        feature.properties = {title: d.id,geo_doc_id: d._id};
        return feature;
    });
    console.log('--end assembling geojson');
    return fc;
}

function reSort(data,key){
    console.log('--Begin resorting');
    var nll = _.filter(data,key,null);
    var notnll = _.reject(data,key,'null');
    notnll = _.sortBy(data,key);
    if(nll.length > 0){
        notnll.push(nll[0]);
    }
    console.log('--End resorting');
    return notnll;
};





module.exports = Mask;