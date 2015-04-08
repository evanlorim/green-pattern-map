var fs = require('fs');
var async = require('async');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;

    var col = db.collection('watersheds');
    var queue = [],
        x = 0;

    fs.readFile('./data/watersheds.geojson', 'utf-8', function(err2, contents) {
        var data = JSON.parse(contents),
            len = data.features.length;
        //console.log(len);
        for (var i = 0; i < len; i++) {
            data.features[i].properties['datatype'] = 'watershed';
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
                    _id: data.properties.MDE8DIGT
                }, function(err, result) {
                    if (err) {
                        console.log(err);
                        setImmediate(function() {
                            callback();
                        });
                    } else {
                        if (result != null) {
                            console.log('Updating existing watershed for ' + data.properties.MDE8NAME);
                            result.geometry = data.geometry;
                            result.properties = data.properties;
                            col.update({
                                _id: data.properties.MDE8DIGT
                            }, result, function() {
                                setImmediate(function() {
                                    callback();
                                });
                            });
                        } else {
                            if (result == null) {
                                console.log('No watershed exists yet, adding one for ' + data.properties.MDE8NAME);
                                var entry = {
                                    _id: data.properties.MDE8DIGT,
                                    geometry: data.geometry,
                                    properties: data.properties
                                };
                                col.insert(entry, {
                                    w: 1
                                }, function(err, result2) {
                                    setImmediate(function() {
                                        callback();
                                    });
                                });
                            } else {
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