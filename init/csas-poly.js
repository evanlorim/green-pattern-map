var fs = require('fs');
var async = require('async');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;

    var col = db.collection('csa-polygons');
    var queue = [],
        x = 0;

    fs.readFile('./data/csas.geojson', 'utf-8', function(err2, contents) {
        var data = JSON.parse(contents),
            len = data.features.length;
        console.log(len);
        data.features.forEach(function(feature){
            var geom = feature.geometry;
            var props = feature.properties;
            if (geom.type === 'MultiPolygon'){
                for (var i = 0; i < geom.coordinates.length; i++){
                    var idx_name = String(props.name) + "_" + String(i);
                    var new_feat = {
                    'geometry' : {'type':'Polygon', 'coordinates':geom.coordinates[i]},
                    'properties': {
                        'name':props.name,
                        'fillcolor':props.fillcolor,
                        'datatype':'csa-polygon',
                        'idx_name':idx_name
                    }
                    };
                    queue.push(new_feat);
                }
            }
        });
        queue.push({
            done: true
        });
        async.eachSeries(queue, function(data, callback) {
            if (data.done) {
                console.log('done');
                process.exit(0);
                setImmediate(function() {
                    callback();
                });
            } else {
                col.findOne({
                    _id: data.properties.idx_name
                }, function(err, result) {
                    if (err) {
                        console.log(err);
                        setImmediate(function() {
                            callback();
                        });
                    } else {
                        if (result != null) {
                            console.log('Updating existing csa-polygon for ' + data.properties.idx_name);
                            result.geometry = data.geometry;
                            result.properties = data.properties;
                            col.update({
                                _id: data.properties.idx_name
                            }, result, function() {
                                setImmediate(function() {
                                    callback();
                                });
                            });
                        } else {
                            if (result == null) {
                                console.log('No csa-polygon exists yet, adding one for ' + data.properties.idx_name);
                                var entry = {
                                    _id: data.properties.idx_name,
                                    geometry: data.geometry,
                                    properties: data.properties
                                };
                                col.insert(entry, {
                                    w: 1
                                }, function(err, result2) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        //console.log(result2[0].properties.idx_name);
                                    }
                                    setImmediate(function() {
                                        callback();
                                    });
                                });
                            } else {
                                console.log('Result is something else : ' + result);
                                setImmediate(function() {
                                    callback();
                                });
                            }
                        }
                    }
                });
            }
        });
    });
});