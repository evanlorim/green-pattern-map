var fs = require('fs');
var async = require('async');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;

    var col = db.collection('neighborhoods');
    var queue = [],
        x = 0;

    fs.readFile('./data/neighborhoods.geojson', 'utf-8', function(err2, contents) {
        var data = JSON.parse(contents),
            len = data.features.length;
        console.log(len);
        for (var i = 0; i < len; i++) {
            data.features[i].properties['datatype'] = 'neighborhood';
            queue.push(data.features[i]);
        }
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
                    _id: data.properties.Name
                }, function(err, result) {
                    if (err) {
                        console.log(err);
                        setImmediate(function() {
                            callback();
                        });
                    } else {
                        if (result != null) {
                            console.log('Updating existing neighborhood for ' + data.properties.Name);
                            result.geometry = data.geometry;
                            result.properties = data.properties;
                            col.update({
                                _id: data.properties.Name
                            }, result, function() {
                                setImmediate(function() {
                                    callback();
                                });
                            });
                        } else {
                            if (result == null) {
                                console.log('No neighborhood exists yet, adding one for ' + data.properties.Name);
                                var entry = {
                                    _id: data.properties.Name,
                                    geometry: data.geometry,
                                    properties: data.properties
                                };
                                col.insert(entry, {
                                    w: 1
                                }, function(err, result2) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        //console.log(result2[0].properties.Name);
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