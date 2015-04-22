var fs = require('fs');
var async = require('async');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db){
    if (err1) throw err1;
    var col = db.collection('csas');
    var queue = [], x = 0;

    fs.readFile('./data/csas.geojson', 'utf-8', function(err2, contents) {
        var data = JSON.parse(contents),
            len = data.features.length;
        console.log(len);
        for (var i = 0; i < len; i++) {
            data.features[i].properties['datatype'] = 'csa';
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
                    _id: data.properties.name
                }, function(err, result) {
                    if (err) {
                        console.log(err);
                        setImmediate(function() {
                            callback();
                        });
                    } else {
                        if (result != null) {
                            console.log('Updating existing csa for ' + data.properties.name);
                            result.geometry = data.geometry;
                            result.properties = data.properties;
                            col.update({
                                _id: data.properties.name
                            }, result, function() {
                                setImmediate(function() {
                                    callback();
                                });
                            });
                        } else {
                            if (result == null) {
                                console.log('No csa exists yet, adding one for ' + data.properties.name);
                                var entry = {
                                    _id: data.properties.name,
                                    geometry: data.geometry,
                                    properties: data.properties
                                };
                                col.insert(entry, {
                                    w: 1
                                }, function(err, result2) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        //console.log(result2.ops[0].properties.name);
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
