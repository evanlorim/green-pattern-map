

var Indexable = function(info,val_properties,key_property){
    this._info = info;
    this.indexed = val_properties;
    this._key_property = key_property;
    this.index = _.pluck(this._info,this._key_property);
};

Indexable.prototype.swap = function(keys,property){
    var self = this;
    var result = _.reduce(self._info,function(result,i){
        if(_.contains(keys,i[self._key_property])){
            result.push(i[property]);
        }
        return result;
    },[]);
    result = _.uniq(_.flatten(result));
    return result;
};

Indexable.prototype.reverse = function(val,property){
    var self = this;
    var result = _.reduce(self._info,function(result,i){
        var x = i[property];
        if(Array.isArray(x)){
            if(_.contains(x,val)){
                result.push(i[self._key_property]);
            }
        }
        else{
            if(x == val){
                result.push(i[self._key_property]);
            }
        }
        return result;
    },[]);
    return result;
};


var Access = function(data){
    this._data = data;

    this.gpb_types = ['cmos','stormwater'];
    this.geo_types = ['watersheds','csas','neighborhoods'];

    this.cmos = {};
    this.cmos.titles = new Indexable(this._data.cmos.titles,['site_key'],'title');
    this.cmos.uses = new Indexable(this._data.cmos.uses,['site_key'],'title');
    this.cmos.site_key = this._data.cmos.site_key;

    this.stormwater = {};
    this.stormwater.statuses = new Indexable(this._data.stormwater.statuses,['site_key'],'title');
    this.stormwater.bmps = new Indexable(this._data.stormwater.bmps,['site_key'],'title');
    this.stormwater.site_key = this._data.stormwater.site_key;
    this.stormwater.filters = ['statuses','bmps'];

    this.vitalsigns = {};
    this.vitalsigns.sections = new Indexable(this._data.vitalsigns.sections,['obj_keys'],'title');
    this.vitalsigns.titles = new Indexable(this._data.vitalsigns.titles,['obj_key'],'title');

    this.watersheds = {};
    this.watersheds.geojson = this._data.watersheds.geojson;
    this.watersheds.titles = new Indexable(this._data.watersheds.info,['obj_key','site_key'],'title');

    this.neighborhoods = {};
    this.neighborhoods.geojson = this._data.neighborhoods.geojson;
    this.neighborhoods.titles = new Indexable(this._data.neighborhoods.info,['obj_key','site_key'],'title');

    this.csas = {};
    this.csas.geojson = this._data.csas.geojson;
    this.csas.titles = new Indexable(this._data.csas.info,['obj_key','site_key'],'title');

    this.all_sites = [];
    for(var i in this.gpb_types){
        var t = this[this.gpb_types[i]].site_key;
        this.all_sites.push(t);
    }
    this.all_sites = _.flatten(this.all_sites);

};

Access.prototype.FilterQuery = function(){
    this.query = {};

    this.addGpbFilter = function(gpb_type,type,values){
        var self = this;
        if(!self.query.gpb){
            self.query.gpb = {};
        }
        if(!self.query.gpb[gpb_type]){
            self.query.gpb[gpb_type] = {};
        }
        if(!self.query.gpb[gpb_type].filters){
            self.query.gpb[gpb_type].filters = [];
        }
        self.query.gpb[gpb_type].filters.push(
            {'type':type, 'values':values});
    };

    this.addGeoFilter = function(gpb_type,type,values){
        var self = this;
        self.query.geo = {};
        self.query.geo.type = gpb_type;
        if(!self.query.geo.filters){
            self.query.geo.filters = [];
        }
        self.query.geo.filters.push(
            {'type':type, 'values':values});
    };

    this.getGpbFilterCount = function(){
        var self = this;
        var result = [];
        if(self.query.gpb){
            _.forIn(_.keys(self.query.gpb),function(key){
                if(self.query.gpb[key].filters){
                    var count = {};
                    count[key] = {};
                    _.forIn(self.query.gpb[key].filters, function(filter){
                        count[key][filter.type] = filter.values.length;
                    });
                    result.push(count);
                }
                else{
                    result.push({key:0});
                }
            })
        }
        return result;
    };

    this.getActiveGpbTypeFilters = function(type){
        var self = this;
        var result = [];
        if(self.query.gpb){
            if(self.query.gpb[type].filters){
                _.forIn(self.query.gpb[type].filters, function(filter){
                    if(filter.values.length > 0){
                        result.push(filter);
                    }
                });
            }
        }
        return result;
    };

    this.getActiveGpbFilterCount = function(){
        var self = this;
        var result = 0;

    }
};

Access.prototype.findSites = function(site_ids){
    var deferred = Q.defer();
    var request = {};
    request.site_ids = site_ids;
    $.ajax({
        type: "POST",
        url: "api/findsites",
        contentType:'application/json',
        data: JSON.stringify(request),
        success:function(response){
            deferred.resolve(response.data);
        }
    });
    return deferred.promise;
};

Access.prototype.filterSites = function(query){
    var self = this;

    var sites = [];

    var sub;

    if(query.gpb){
        var gpb_types = _.keys(query.gpb);
        _.forIn(gpb_types,function(gpb_type){
           sites.push(self[gpb_type].site_key);
        });
        sites = _.flatten(sites);
        _.forIn(gpb_types,function(gpb_type){
            if(query.gpb[gpb_type].filters) {
                if(!sub){
                    sub = [];
                }
                var subsub = [];
                _.forIn(query.gpb[gpb_type].filters, function (filter) {
                    var t = filter.type;
                    var vals = filter.values;
                    var indexable = self[gpb_type][t];
                    var d = indexable.swap(vals, 'site_key');
                    subsub.push(d);
                });
                sub.push(_.unique(_.flatten(subsub)));
            }
        });

        if(sub){
            sites = _.flatten(sub);
        }
    }

    if(query.geo && query.geo.filters){
        var geo_type = query.geo.type;
        var sub = [];
        _.forIn(query.geo.filters,function(filter){
            var t = filter.type;
            var vals = filter.values;
            var indexable = self[geo_type][t];
            var d = indexable.swap(vals,'site_key');
            sub.push(d);
        });
        sub = _.unique(_.flatten(sub));
        sites = _.intersection(sites,sub);
    }

    return sites;
};

Access.prototype.findLayers = function(collection,obj_ids){
    var deferred = Q.defer();
    var request = {};
    request.collection = collection;
    request.obj_ids = obj_ids;
    $.ajax({
        type: "POST",
        url: "api/findgeo",
        contentType:'application/json',
        data: JSON.stringify(request),
        success:function(response){
            var data = response.data;
            var geojson = {type:'FeatureCollection','features': _.pluck(data,'geo')};
            deferred.resolve(geojson);
        }
    });
    return deferred.promise;
};

Access.prototype.filterLayers = function(query){
    var self = this;
    var layers = [];

    if(query.geo && query.geo.filters){
        var geo_type = query.geo.type;
        var sub = [];
        _.forIn(query.geo.filters,function(filter){
            var t = filter.type;
            var vals = filter.values;
            var indexable = self[geo_type][t];
            var d = indexable.swap(vals,'obj_key');
            sub.push(d);
        });
        sub = _.unique(_.flatten(sub));
        layers = sub;
    }
    else{
        return false;
    }

    var result = {'layer':query.geo.type, 'obj_keys':layers};

    return result;
};
function getAccess(){
    var self = this;
    var deferred = Q.defer();

    getData()
        .then(function(data){
            var A = new Access(data);
            deferred.resolve(A);
        })
        .fail(function(error){
            deferred.reject(error);
        });

    return deferred.promise;

    function getData(){
        var _data = {};
        var deferred = Q.defer();
        watersheds()
            .then(function(data){
                _data.watersheds = data;
                console.log("...got watersheds");
                return neighborhoods();
            })
            .then(function(data){
                _data.neighborhoods = data;
                console.log("...got neighborhoods");
                return csas();
            })
            .then(function(data){
                _data.csas = data;
                console.log("...got csas");
                return cmos();
            })
            .then(function(data){
                _data.cmos = data;
                console.log("...got cmos");
                return stormwater();
            })
            .then(function(data){
                _data.stormwater = data;
                console.log("...got stormwater");
                return vitalsigns();
            })
            .then(function(data){
                _data.vitalsigns = data;
                console.log("...got vitalsigns");
                console.log("...Finished loading data");
                deferred.resolve(_data);
            })
            .fail(function(error){
                deferred.reject(new Error(error));
            });
        return deferred.promise;
    }

    function watersheds(){
        var deferred = Q.defer();
        $.get("api/access_watersheds").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }

    function neighborhoods(){
        var deferred = Q.defer();
        $.get("api/access_neighborhoods").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }

    function csas(){
        var deferred = Q.defer();
        $.get("api/access_csas").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }

    function cmos(){
        var deferred = Q.defer();
        $.get("api/access_cmos").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }

    function stormwater(){
        var deferred = Q.defer();
        $.get("api/access_stormwater").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }

    function vitalsigns(){
        var deferred = Q.defer();
        $.get("api/access_vitalsigns").success(function(response,status){
            deferred.resolve(response.data);
        });
        return deferred.promise;
    }
}





