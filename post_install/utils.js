var mongo = require('mongodb');
var parse = require('csv-parse');
var fs = require('fs');
var q = require('q');
var _ = require('lodash');

var Utils = function(options){};

Utils.prototype.connect = function(mongouri,callback){
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect(mongouri, {
        auto_reconnect : true
    }, function(err, database){
        if(err){throw err;}
        console.log("Connected to database...");
        callback(database);
    });
};

Utils.prototype.exit = function(cleanup){
    if(cleanup){process.on('exit',function(){
        cleanup();
        console.log("...finished");
    });}
    else{
        process.on('exit',function(){
            console.log("...finished");
        })
    }
    process.exit(0);
};

Utils.prototype.errorCheck = function(error){
    var type = Object.prototype.toString.call(error);
    if(type == '[object Error]'){return error;}
    else{
        return new Error(error);
    }
};

Utils.prototype.clearCollection = function(db,name){
    //Just creating a clean database each time... can create update functions later...
    var deferred = q.defer();
    var col = db.collection(name);
    col.removeMany({},function(error,results){
        if(error){throw error;}
        else{
            console.log("--Cleared <" + name + "> collection");
        }
        deferred.resolve(results);
    });
    return deferred.promise;
};

Utils.prototype.readCsv = function(reference){
    var self = this;
    var deferred = q.defer();
    var rows = [];
    var options = parse({
        delimiter: ',',
        quote: '"',
        columns: true
    });
    var readstream = fs.createReadStream(reference,{autoClose:true}).pipe(options)
        .on("error", function(error){
            deferred.reject(self.errorCheck(error));
        }).on("end", function(){
            deferred.resolve(rows);
        }).on("data", function(data){
            rows.push(self.cleanCsvRow(data));
        });
    return deferred.promise;
};

Utils.prototype.writeDocuments = function(db,documents,collection){
    var self = this;
    var deferred = q.defer();
    var col = db.collection(collection);
    //chunking into 500s, to avoid write limit.
    var chunks = _.chunk(documents, 500);
    var chunk_funcs = _.map(chunks, function(chunk){
        return new insertChunk(chunk);
    });
    q.all(chunk_funcs).then(function(results){
        deferred.resolve(results);
    },function(error){
        deferred.reject(self.errorCheck(error));
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

    return deferred.promise;
};

Utils.prototype.readGeoJson = function(reference){
    var self = this;
    var deferred = q.defer();
    fs.readFile(reference, 'utf-8', function(error, data){
        if(error){
            deferred.reject(self.errorCheck(error));
        }
        else{
            deferred.resolve(JSON.parse(data));
        }
    });
    return deferred.promise;
};

Utils.prototype.formatGeoJsonFeatureDocument = function(id,geometry,dataset){
    var response = {};
    response.type = "Feature";
    response.id = id;
    response.geometry = geometry;
    response.properties = [];
    response._dataset = dataset;
    return response;
};

Utils.prototype.formatSiteDocument = function(site){
    var self = this;
    if(!site.site_id || !site.point_x || !site.point_y || !site.gpb_type || parseFloat(site.point_x) == 0 || parseFloat(site.point_y) == 0){
        return false;
    }
    if(site.gpb_type == 'stormwater'){
        return self.formatStormwaterSiteDocument(site);
    }
    else if(site.gpb_type == 'cmos'){
        return self.formatCmosSiteDocument(site);
    }
    else{
        return false;
    }
};

Utils.prototype.formatVitalSignDocument = function(vsdatum){
    if(!vsdatum.csa){
        return false;
    }
};

Utils.prototype.formatCmosSiteDocument = function(site){
    var result = {};
    result.id = site.site_id;
    result.coordinates = [site.point_x,site.point_y];
    result._dataset = 'cmos';
    if(site.site_name){
        result.site_name = _.startCase(site.site_name);
    }else{result.name = null;}
    if(site.address){
        result.address = _.startCase(site.address);
    }else{result.address = null;}
    if(site.site_use){
        var uses = site.site_use.split(",");
        uses = _.map(uses, _.trim);
        result.uses = uses;
    }else{result.uses = null;}
    return result;
};

Utils.prototype.formatStormwaterSiteDocument = function(site){
    var result = {};
    result.id = site.site_id;
    result.coordinates = [site.point_x,site.point_y];
    result._dataset = 'stormwater';
    if(site.status){
        result.status = _.startCase(site.status);
    }else{result.status = null;}
    if(site.source){
        result.source = site.source;
    }else{result.source = null;}
    if(site.bmp_typ){
        var bmps = site.bmp_type.split(",");
        bmps = _.map(bmps, _.trim);
        result.bmps = bmps;
    }else{result.bmps = null;}
    return result;
};

Utils.prototype.cleanCsvRow = function(row){
    var result = {};
    _.forIn(row, function(val, key){
        val = String(val);
        val = val.toLowerCase();
        val = _.trim(val);
        key = key.toLowerCase();
        if(val == 'n/a' || val == ''){
            val = null;
        }
        result[key] = val;
    });
    return(result);
};

Utils.prototype.loadCsasGeo = function(db){
    var self = this;
    var deferred = q.defer();
    self.readGeoJson("data/csas.geojson")
        .then(function(geodata){
            var new_features = [];
            for(i in geodata.features){
                var feature = geodata.features[i];
                var id = self.makePrettyString(feature.properties.name);
                var new_feature = self.formatGeoJsonFeatureDocument(id, feature.geometry,"csas");
                new_features.push(new_feature);
            }
            return(self.writeDocuments(db,new_features,"geospatial"));
        }).then(function(result){
            console.log("--Inserted <csas> geodata");
            deferred.resolve(result);
        },function(error){
            deferred.reject(self.errorCheck(error));
        });
    return deferred.promise;
};

Utils.prototype.loadNeighborhoodsGeo = function(db){
    var self = this;
    var deferred = q.defer();
    self.readGeoJson("data/neighborhoods.geojson")
        .then(function(geodata){
            var new_features = [];
            for(i in geodata.features){
                var feature = geodata.features[i];
                var id = self.makePrettyString(feature.properties.Name);
                var new_feature = self.formatGeoJsonFeatureDocument(id, feature.geometry,"neighborhoods");
                new_features.push(new_feature);
            }
            return(self.writeDocuments(db,new_features,"geospatial"));
        }).done(function(result){
            console.log("--Inserted <neighborhoods> geodata");
            deferred.resolve(result);
        },function(error){
            deferred.reject(self.errorCheck(error));
        });
    return deferred.promise;
};

Utils.prototype.loadWatershedsGeo = function(db){
    var self = this;
    var deferred = q.defer();
    self.readGeoJson("data/watersheds.geojson")
        .then(function(geodata){
            var new_features = [];
            for(i in geodata.features){
                var feature = geodata.features[i];
                var id = self.makePrettyString(feature.properties.MDE8NAME);
                var new_feature = self.formatGeoJsonFeatureDocument(id, feature.geometry,"watersheds");
                new_features.push(new_feature);
            }
            return(self.writeDocuments(db,new_features,"geospatial"));
        }).then(function(result){
            console.log("--Inserted <watersheds> geodata");
            deferred.resolve(result);
        },function(error){
            deferred.reject(self.errorCheck(error));
        });
    return deferred.promise;
};

Utils.prototype.loadGeoSpatial = function(db){
    var self = this;
    var deferred = q.defer();
    var results = [];
    console.log("Begin loading geospatial data");
    self.clearCollection(db,"geospatial")
        .then(function(result){
            results.push(result);
            return(q.all([
                self.loadCsasGeo(db),
                self.loadNeighborhoodsGeo(db),
                self.loadWatershedsGeo(db)
            ]));
        }).done(function(result){
            for(var i in result){
                results.push(result[i]);
            }
            deferred.resolve(results);
            console.log("End loading geospatial data");
        },function(error){
            deferred.reject(self.errorCheck(error));
        });
    return deferred.promise;
};

Utils.prototype.loadSites = function(db){
    var self = this;
    var deferred = q.defer();
    console.log("Begin loading sites data");
    self.clearCollection(db, "sites")
        .then(function(){
            return self.readCsv('data/sites.csv');
        })
        .then(function(sites){
            var documents = [];
            for(i in sites){
                var doc = self.formatSiteDocument(sites[i]);
                if(doc){
                    documents.push(doc);
                }
            }
            return(self.writeDocuments(db,documents,"sites"));
        })
        .done(function(result){
            console.log("--Inserted <sites> data");
            deferred.resolve(result);
            console.log("End loading site data");
        },function(error){
            deferred.reject(self.errorCheck(error));
        });

    return deferred.promise;
};

Utils.prototype.loadVitalSigns = function(db){
    var self = this;
    var deferred = q.defer();
    var data;
    console.log("Begin loading vital signs data");
    self.clearCollection(db,'indicators')
        .then(function(){
            return self.readCsv('data/vitalsigns.csv');
        })
        .then(function(vsdata){
            data = vsdata;
            return self.readCsv('data/vitalsigns_meta.csv');
        })
        .then(function(metadata){
            var documents = self.formatVitalSignsDocuments(data,metadata);
            console.log(_.shuffle(documents));
            return(self.writeDocuments(db,documents,"indicators"));
        }).done(function(results){
            console.log("--Inserted <indicators> data");
            deferred.resolve(results);
            console.log("End loading vital signs data");
        },function(error){
            deferred.reject(self.errorCheck(error));
        });
    return deferred.promise;
};

Utils.prototype.find = function(db,collection,query){
    var self = this;
    var deferred = q.defer();
    var col = db.collection(collection);
    col.find(query).toArray(function(error,results){
        if(error){deferred.reject(self.errorCheck(error))}
        else{
            deferred.resolve(results);
        }
    });
    return deferred.promise;
};

Utils.prototype.cleanVitalSignsData = function(rows){
    var self = this;
    var results = [];
    _.forIn(rows, function(row){
        var result = {};
        var csa = row['csa'];
        var notcsa = _.omit(row,'csa');
        result['csa'] = self.makePrettyString(csa);
        _.forIn(notcsa,function(value,key){
            if(value){
                result[key] = parseFloat(value);
            }
            else{result[key] = null;}
        });
        results.push(result);
    });
    return results;
};

Utils.prototype.cleanVitalSignsMetadata = function(rows){
    var self = this;
    rows = _.map(rows,function(val){
        if(val.full_name){
            val.full_name = self.makePrettyString(val.full_name);
        }
        if(val.source){
            val.source = self.makePrettyString(val.source);
        }
        if(val.section){
            val.section = self.makePrettyString(val.section);
        }
        if(val.color1 && !_.startsWith(val.color1, "#")){
            val.color1 = "#" + val.color1;
        }
        if(val.color2 && !_.startsWith(val.color2, "#")){
            val.color2 = "#" + val.color2;
        }
        if(val.color3 && !_.startsWith(val.color3, "#")){
            val.color3 = "#" + val.color3;
        }
        if(val.color4 && !_.startsWith(val.color4, "#")){
            val.color4 = "#" + val.color4;
        }
        if(val.color5 && !_.startsWith(val.color5, "#")){
            val.color5 = "#" + val.color5;
        }
        return val;
    });
    return rows;
};

Utils.prototype.makePrettyString = function(str){
    str = str.toLowerCase();

    var parts = str.split("/");
    parts = _.map(parts, proper_capitalize);
    str = parts.join("/ ");

    parts = str.split(" ");
    parts = _.map(parts, proper_capitalize);
    str = parts.join(" ");

    parts = str.split("-");
    parts = _.map(parts, proper_capitalize);
    str = parts.join("-");

    parts = str.split("(");
    parts = _.map(parts, proper_capitalize);
    str = parts.join("(");

    return(capitalizeFirstLetter(str));

    function proper_capitalize(str){
        var non_capitals = ["by","of","and","the","or","in","but","nor","to","for","so","yet","an","is","on","from","into","off","on","out","per","than","then","up","down","when","with"];
        for(i in non_capitals){
            if(non_capitals[i] == str){
                return str.toLowerCase();
            }
        }
        return _.capitalize(str);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
};

Utils.prototype.formatVitalSignsDocuments = function(vsdata,vsmeta){
    var self = this;
    vsdata = self.cleanVitalSignsData(vsdata);
    vsmeta = self.cleanVitalSignsMetadata(vsmeta);
    var csas = _.pluck(vsdata,'csa');
    var tmp = _.transform(vsdata,function(result, row){
        _.forIn(row, function(value, key){
           if(value != null){result.push(key);}
        });
    });
    var nonempty = _.uniq(tmp);
    nonempty = _.without(nonempty,'csa');
    var organized = [];
    _.forIn(nonempty, function(indicator){
        var doc = {};
        doc['data'] = _.transform(vsdata,function(result, row){
            result[row['csa']] = {};
            result[row['csa']]['value'] = row[indicator];
        });
        var meta = _.find(vsmeta, _.matchesProperty('short_name',indicator));
        if(meta){
            doc['colors'] = [meta.color1,meta.color2,meta.color3,meta.color4,meta.color5];
            doc['full_name'] = meta.full_name;
            doc['source'] = meta.source;
            doc['stats'] = {};
            doc['stats']['avg'] = parseFloat(meta.city_val);
            doc['format'] = meta.format;
            doc['section'] = meta.section;
        }
        doc.id = indicator;
        organized.push(doc);
    });
    return organized;
};


module.exports = Utils;