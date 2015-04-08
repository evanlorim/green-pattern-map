var fs = require('fs');
var csv = require('csv-parse');
var async = require('async');

var queue = [];

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';
MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;

    var col = db.collection('vs13');
    var cvsrs = csv({
        delimiter: ',',
        quote: '"',
        columns: true
    });

    var rs = fs.createReadStream('./data/vs13.csv', {
        autoClose: true
    }).pipe(cvsrs)
        .on('error', function(err) {
            console.error(err);
        })
        .on('end', function() {
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
                        _id: data.csa
                    }, function(err, result) {
                        if (err) {
                            console.log(err);
                            setImmediate(function() {
                                callback();
                            });
                        } else {
                            if (result != null) {
                                console.log('Updating existing vs data for ' + data.csa);
                                result.properties = data;
                                result.properties.datatype = 'vs';
                                col.update({
                                    _id: data.csa
                                }, result, function() {
                                    setImmediate(function() {
                                        callback();
                                    });
                                });
                            } else {
                                if (result == null) {
                                    console.log('No site exists yet, adding one for ' + data.csa);
                                    var newitem = {};
                                    newitem._id = data.csa;
                                    newitem.properties = data;
                                    col.insert(newitem, {
                                        w: 1
                                    }, function(err, result2) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            //console.log(result2[0].site_id);
                                        }
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

        })
        .on('data', function(data) {
            queue.push(data);
        });
});