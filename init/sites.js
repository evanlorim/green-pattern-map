/*
 site_id,
 site_name,
 address,
 location,
 block,
 lot,
 POINT_X,
 POINT_Y,
 Watershed,
 Subwatersh,
 site_use,
 status,
 drain_acres,
 pct_imp,
 Imp_acres,
 An_Runoff,
 Retrofit_Type,
 bmp_type,
 feasibility,
 design_difficulty,
 watershed_benefit,
 priority,
 oldsiteid,
 gpb_type,
 bmp_drainiage,
 bmp_impervious,
 bmp_imptreat,
 costs_est,
 costs_maintenance,
 resp_party,
 organizations,
 contact,
 CSA
 */

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

    var col = db.collection('sites');
    var csa_col = db.collection('csas');
    var nh_col = db.collection('neighborhoods');
    var cvsrs = csv({
        delimiter: ',',
        quote: '"',
        columns: true
    });

    var rs = fs.createReadStream('./data/bcdpw_sites.csv', {
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
                        _id: data.site_id
                    }, function(err, result) {
                        if (err) {
                            console.log(err);
                            setImmediate(function() {
                                callback();
                            });
                        } else {
                            if (result != null) {
                                console.log('Updating existing site for ' + data.site_id);
                                if (parseFloat(data.POINT_X)) {
                                    result.geometry = {
                                        "type": "Point",
                                        "coordinates": [parseFloat(data.POINT_X), parseFloat(data.POINT_Y)]
                                    }
                                }
                                var csa = result.properties.CSA;
                                var nh = result.properties.neighborhood;
                                result.properties = data;
                                result.properties.CSA = csa;
                                result.properties.neighborhood = nh;
                                result.properties.datatype = 'site';
                                col.update({
                                    _id: data.site_id
                                }, result, function() {
                                    setImmediate(function() {
                                        callback();
                                    });
                                });
                            } else {
                                if (result == null) {
                                    console.log('No site exists yet, adding one for ' + data.site_id);
                                    var newitem = {};
                                    newitem._id = data.site_id;
                                    newitem.properties = data;
                                    if (parseFloat(data.POINT_X)) {
                                        newitem.geometry = {
                                            "type": "Point",
                                            "coordinates": [parseFloat(data.POINT_X), parseFloat(data.POINT_Y)]
                                        }
                                    }
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