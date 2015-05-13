var mongo = require('mongodb');
var parse = require('csv-parse');
var fs = require('fs');
var q = require('q');
var traverse = require('traverse');
var geolib = require('geolib');
var ss = require('simple-statistics');
var _ = require('lodash');

var Load = function(options){
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

Load.prototype.connect = function(mongouri){
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



Load.prototype.loadWatersheds = function(){
    var self = this;
    var deferred = q.defer();
    var reference = 'data/watersheds.geojson';
    console.log("Begin loading <watersheds> data");
    clearCollection(self.db,'watersheds')
        .then(function(){
            return readGeoJsonFeatures(reference);
        })
        .then(function(features){
            console.log("--Read <watersheds> data");
            features = clean(features);
            features = process(features);
            var documents  = createDocuments(features);
            return writeCollection(self.db,documents,"watersheds");
        }).then(function(results){
            console.log("--Wrote <watersheds> data");
            console.log("End loading <watersheds> data");
            deferred.resolve(results);
        }).fail(function(error){
            deferred.reject(new Error(error));
        });
    return(deferred.promise);

    function clean(features){
        _.forIn(features,function(feature){
            feature.geometry.coordinates = cleanCoordinates(feature.geometry.coordinates);
            feature.properties.MDE8NAME = formatString(feature.properties.MDE8NAME);
        });
        return features;
    }

    function process(features){
        _.forIn(features,function(feature){
            feature._center = getCenter(feature.geometry.coordinates);
        });
        return features;
    }

    function createDocuments(features){
        var docs = _.map(features,function(feature){
            var doc = {};
            doc.geo = {};
            doc.geo.type = 'Feature';
            doc.geo.properties = {};
            doc.geo.geometry = feature.geometry;
            doc.id = feature.properties.MDE8NAME;
            doc.data = {};
            doc.data.center = feature._center;
            return doc;
        });
        return docs;
    }
};

Load.prototype.loadNeighborhoods = function(){
    var self = this;
    var deferred = q.defer();
    var reference = 'data/neighborhoods.geojson';
    console.log("Begin loading <neighborhoods> data");
    clearCollection(self.db,'neighborhoods')
        .then(function(){
            return readGeoJsonFeatures(reference);
        })
        .then(function(features){
            console.log("--Read <neighborhoods> data");
            features = clean(features);
            features = process(features);
            var documents  = createDocuments(features);
            return writeCollection(self.db,documents,"neighborhoods");
        }).then(function(results){
            console.log("--Wrote <neighborhoods> data");
            console.log("End loading <neighborhoods> data");
            deferred.resolve(results);
        }).fail(function(error){
            deferred.reject(new Error(error));
        });
    return(deferred.promise);

    function clean(features){
        _.forIn(features,function(feature){
            feature.geometry.coordinates = cleanCoordinates(feature.geometry.coordinates);
            feature.properties.Name = formatString(feature.properties.Name);
        });
        return features;
    }

    function process(features){
        _.forIn(features,function(feature){
            feature._center = getCenter(feature.geometry.coordinates);
        });
        return features;
    }

    function createDocuments(features){
        var docs = _.map(features,function(feature){
            var doc = {};
            doc.geo = {};
            doc.geo.type = 'Feature';
            doc.geo.properties = {};
            doc.geo.geometry = feature.geometry;
            doc.id = feature.properties.Name;
            doc.data = {};
            doc.data.center = feature._center;
            return doc;
        });
        return docs;
    }
};

Load.prototype.loadCsas = function(){
    var self = this;
    var deferred = q.defer();
    var reference = 'data/csas.geojson';
    console.log("Begin loading <csas> data");
    clearCollection(self.db,'csas')
        .then(function(){
            return readGeoJsonFeatures(reference);
        })
        .then(function(features){
            console.log("--Read <csas> data");
            features = clean(features);
            features = process(features);
            var documents  = createDocuments(features);
            return writeCollection(self.db,documents,"csas");
        }).then(function(results){
            console.log("--Wrote <csas> data");
            console.log("End loading <csas> data");
            deferred.resolve(results);
        }).fail(function(error){
            deferred.reject(new Error(error));
        });
    return(deferred.promise);

    function clean(features){
        _.forIn(features,function(feature){
            feature.geometry.coordinates = cleanCoordinates(feature.geometry.coordinates);
            feature.properties.name = formatString(feature.properties.name);
        });
        return features;
    }

    function process(features){
        _.forIn(features,function(feature){
            feature._center = getCenter(feature.geometry.coordinates);
        });
        return features;
    }

    function createDocuments(features){
        var docs = _.map(features,function(feature){
            var doc = {};
            doc.geo = {};
            doc.geo.type = 'Feature';
            doc.geo.properties = {};
            doc.geo.geometry = feature.geometry;
            doc.id = feature.properties.name;
            doc.data = {};
            doc.data.center = feature._center;
            return doc;
        });
        return docs;
    }
};

Load.prototype.loadSites = function(){
    var self = this;
    var deferred = q.defer();
    var reference = 'data/sites.csv';
    console.log("Begin loading <sites> data");
    clearCollection(self.db,'sites')
        .then(function(){
            return readCsv(reference);
        })
        .then(function(rows){
            console.log("--Read <sites> data");
            rows = clean(rows);
            rows = process(rows);
            var docs = createDocuments(rows);
            return writeCollection(self.db,docs,'sites');
        })
        .then(function(results){
            console.log("--Wrote <sites> data");
            console.log("End loading <sites> data");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });

    return(deferred.promise);

    function clean(rows){
        _.forIn(rows,function(row){
            //All sites
            row.POINT_X = !row.POINT_X ? null : parseFloat(row.POINT_X);
            row.POINT_Y = !row.POINT_Y ? null : parseFloat(row.POINT_Y);
            row.site_id = !row.site_id ? null : String(row.site_id).toLowerCase();
            row.gpb_type = !row.gpb_type ? null : String(row.gpb_type).toLowerCase();

            //Cmos sites
            row.site_name = !row.site_name ? null : formatString(row.site_name);
            row.address = !row.address ? null : formatString(row.address);
            row.site_use = !row.site_use ? null : (function(){
                var parsed = String(row.site_use).split(",");
                var cleaned  = _.map(parsed, formatString);
                return cleaned;
            })();

            //Stormwater sites
            row.status = !row.status ? null : formatString(row.status);
            row.source = !row.source ? null : String(row.source); //no formatting too much caps
            row.bmp_type = !row.bmp_type ? null : (function(){
                var parsed = String(row.bmp_type).split(",");
                var cleaned = _.map(parsed, formatString);
                return cleaned;
            })();
        });

        return rows;
    }

    function process(rows){
        //get rid of anything that doesnt have a full point, site id or type
        rows = _.reject(rows,function(row){
            return (!row.site_id || !row.POINT_X || !row.POINT_Y || !row.gpb_type)
        });
        return rows;
    }

    function createDocuments(rows){
        var docs = _.map(rows, function(row){
            var doc = {};

            doc.id = row.site_id;
            doc.set = row.gpb_type; // to avoid confusion with other 'types'
            doc.coordinates = [row.POINT_X, row.POINT_Y];

            if(row.gpb_type == 'cmos'){
                doc.name = row.site_name;
                doc.address = row.address;
                doc.uses = row.site_use;
            }
            else if(row.gpb_type == 'stormwater'){
                doc.status = row.status;
                doc.source = row.source;
                doc.bmps = row.bmp_type;
            }
            return doc;
        });

        return docs;
    }
};

Load.prototype.loadVitalSigns = function(){
    var self = this;
    var deferred = q.defer();
    var csas_reference = "data/vs_csas.csv";
    var indicators_reference = "data/vs_indicators.csv";
    console.log("Begin loading <vs> data");
    clearCollection(self.db,'vs')
        .then(function(){
            return clearCollection(self.db,'vs_csas');
        })
        .then(function(){
            //return the results of reading the two csvs as an object...
            return q.all([readCsv(csas_reference), readCsv(indicators_reference)])
                .spread(function(csas,indicators){
                    return {'csas':csas,'indicators':indicators};
                });
        })
        .then(function(data){
            data = clean(data);
            data = process(data);
            var docs = createDocuments(data);
            return(writeCollection(self.db,docs,'vs'));
        })
        .then(function(results){
            console.log("--Wrote <vs> data");
            console.log("End loading <vs> data");
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });

    return(deferred.promise);

    function clean(data){

        data.csas = cleanCsas(data.csas);
        data.indicators = cleanIndicators(data.indicators);

        return data;

        function cleanCsas(rows){

            rows = _.map(rows,function(row){
                var csa = row.csa;
                var rest = _.omit(row,'csa');

                csa = !csa ? null : formatString(csa); //extra precautious
                //make sure that all column names are lowercase;
                row = _.transform(rest,function(result,val,key){
                    val = !val ? null : parseFloat(val);
                    key = !key ? null : key.toLowerCase();
                    result[key] = val;
                });
                row.csa = csa;
                return row;
            });

            return rows;
        }
        function cleanIndicators(rows){
            _.forIn(rows,function(row){
                row.short_name = !row.short_name ? null : row.short_name.toLowerCase();
                row.full_name = !row.full_name ? null : formatString(row.full_name);
                row.format = !row.format ? null : row.format.toLowerCase();
                row.section = !row.section ? null : formatString(row.section);
                row.source = !row.source ? null : formatString(row.source);
                row.city_val = !row.city_val ? null : parseFloat(row.city_val);

                row.color1 = !row.color1 ? null : _.trim(row.color1).toLowerCase();
                row.color2 = !row.color2 ? null : _.trim(row.color2).toLowerCase();
                row.color3 = !row.color3 ? null : _.trim(row.color3).toLowerCase();
                row.color4 = !row.color4 ? null : _.trim(row.color4).toLowerCase();
                row.color5 = !row.color5 ? null : _.trim(row.color5).toLowerCase();

            });
            return rows;

        }

    }

    function process(data){

        var data = filterData(data);
        data = aggregate(data);
        data = compute(data);
        return data;

        function filterData(data){

            data.csas = filterCsas(data.csas);
            data.indicators = filterIndicators(data.indicators);
            data = filterTogether(data);

            return data;


            function filterCsas(rows){
                //make sure csas arent in there...
                var rest = _.map(rows,function(row){
                    return _.omit(row,'csa');
                });
                //find any indicator that has at least one non-null value
                var nonempty_indicators = _.transform(rest,function(results,row){
                    _.forIn(row, function(val,key){
                        if( val != null && !(_.includes(results,key) )){
                            results.push(key);
                        }
                    });
                });

                var to_include = nonempty_indicators;
                to_include.push('csa'); //add csa back in there...

                //filter out any empty indicators...
                rows = _.map(rows,function(row){
                    return _.pick(row,to_include);
                });

                return rows;
            }

            //may actually be unneeded
            function filterIndicators(rows){
                rows = _.filter(rows,function(row){
                    if(row.short_name && row.full_name && row.section && row.color1){return true;}
                    return false;
                });

                return rows;
            }

            function filterTogether(data){
                var indicator_indicators = _.map(data.indicators,function(row){
                    return row.short_name;
                });
                var csa_indicators = _.without(_.keys(data.csas[0]),'csa');

                var indicators = _.intersection(indicator_indicators, csa_indicators);

                data.indicators = _.filter(data.indicators,function(row){
                   if(_.includes(indicators, row.short_name)){return true;}
                    return false;
                });

                var to_include = indicators;
                to_include.push('csa');

                data.csas = _.map(data.csas, function(row){
                    return _.pick(row,to_include);
                });

                return data;
            }
        }


        function aggregate(data){
            var agg = _.transform(data.indicators, function(results, row){
                var datum = row;
                var id = row.short_name;
                datum.csa_data = _.transform(data.csas,function(results, row){
                    //results[row.csa] = row[id];
                    results.push({'id':row.csa,'value':row[id]
                    });
                });
                results.push(datum);
            },[]);

            return agg;
        }

        function compute(data){
            var num_breaks = 5;
            data = _.map(data,function(val){
                val.csa_data = _.map(val.csa_data,function(d){
                    d.interval = null;
                    return d;
                });
                var result = val;
                var raw_data = _.map(val.csa_data,function(v){return v.value;});
                raw_data = _.filter(raw_data,function(d){if(d){return true;} return false;});

                var breaks = ss.jenks(raw_data,num_breaks);
                result.min = breaks[0];
                result.max = breaks[num_breaks];
                result.intervals = [];
                for(var i = 1; i <= num_breaks; i++){
                    var interval = [breaks[i-1],breaks[i]];
                    result.intervals.push(interval);
                }

                _.forIn(_.range(result.intervals.length),function(i){
                    var interval = result.intervals[i];
                    if(interval[1] == result.max){
                        val.csa_data = _.map(val.csa_data,function(d){
                            if(d.value >= interval[0] && d.value <= interval[1]){
                                d.interval = i;
                            }
                            return d;
                        });
                    }
                    else{
                        val.csa_data = _.map(val.csa_data,function(d){
                            if(d.value >= interval[0] && d.value < interval[1]){
                                d.interval = i;
                            }
                            return d;
                        })
                    }
                });
                return result;
            });
            return data;
        }
    }

    function createDocuments(data){
        var docs = _.map(data,function(val){
            var doc = {};
            doc.id = val.short_name;
            doc.name = val.full_name;
            doc.section = val.section;
            doc.colors = [val.color1,val.color2,val.color3,val.color4,val.color5];
            doc.intervals = val.intervals;
            doc.source = val.source;
            doc.stats = {};
            doc.stats.avg = val.city_val;
            doc.stats.min = val.min;
            doc.stats.max = val.max;
            doc.data = val.csa_data;

            return doc;
        });
        return(docs);
    }
};


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

function readCsv(reference){
    var deferred = q.defer();
    var rows = [];
    var options = parse({
        delimiter: ',',
        quote: '"',
        columns: true
    });
    var readstream = fs.createReadStream(reference,{autoClose:true}).pipe(options)
        .on("error", function(error){
            deferred.reject(error);
        }).on("end", function(){
            deferred.resolve(rows);
        }).on("data", function(data){
            rows.push(replaceNa(data));
        });
    return deferred.promise;

    function replaceNa(row){
        var result = {};
        _.forIn(row,function(val,key){
            if(val == 'n/a' || val == ''|| val == 'N/A'){
                val = null;
            }
            result[key] = val;
        });
        return result;
    }
}

function readGeoJsonFeatures(reference){
    var deferred = q.defer();
    fs.readFile(reference, 'utf-8', function(error, data){
        if(error){
            deferred.reject(error);
        }
        else{
            deferred.resolve(JSON.parse(data).features);
        }
    });
    return deferred.promise;
}

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

function formatString(str){
    str = String(str);
    str = str.toLowerCase();
    str = _.trim(str);

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
        var all_capitals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xx'];
        for(i in non_capitals){
            if(non_capitals[i] == str){
                return str.toLowerCase();
            }
            if(all_capitals[i] == str){
                return str.toUpperCase();
            }
        }
        return _.capitalize(str);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

function cleanCoordinates(coordinates){
    traverse(coordinates).forEach(function(x){
        if(typeof(x) != 'object'){
            this.update(parseFloat(x));
        }
    });
    return coordinates;
}

function getCenter(coordinates){
    result = [];
    traverse(coordinates).forEach(function(x){
        if(x[0] && x[0][0] && typeof(x[0][0]) != 'object'){
            result.push(geolib.getCenter(x));

        }
    });
    if(result.length > 1){
        result = geolib.getCenter(result);
    }
    else{
        result = result[0];
    }
    return [result.longitude,result.latitude];
}

module.exports = Load;