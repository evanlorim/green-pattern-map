var fs = require('fs');
var csv = require('csv-parse');
var async = require('async');
var gju = require('geojson-utils');
var trim = require('trim');
var turf = require('turf');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;
    else{
        var num_intervals = 5;
        var queue = [];
        var vs_csa = db.collection('vs13');
        var vs_ind = db.collection('vs13_indicators');
        var csas = db.collection('csas');
        var num_csa = 0;
        var cvsrs = csv({
            delimiter: ',',
            quote: '"',
            columns: true
        });

        get_info(function(){update_info(function(){update_csas(exit)});});

        function get_info(call){
            var rs = fs.createReadStream('./data/vs13_indicator_info.csv', {
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
                            console.log('first step done');
                            call();
                        }
                        else if(data['short_name'].length < 2){
                            setImmediate(function() {
                                callback();
                            });
                        }
                        else {
                            vs_ind.findOne({
                                _id: data.short_name
                            }, function(err, result) {
                                if (err) {
                                    console.log(err);
                                    setImmediate(function() {
                                        callback();
                                    });
                                } else {
                                    if (result != null) {
                                        console.log('Updating existing indicator info for ' + data['short_name']);
                                        var props = {};
                                        result.properties = data;
                                        vs_ind.updateOne({
                                            _id: data['short_name']
                                        }, result, function() {
                                            setImmediate(function() {
                                                callback();
                                            });
                                        });
                                    } else {
                                        if (result == null) {
                                            console.log('No indicator info exists yet, adding for ' + data['short_name']);
                                            var newitem = {};
                                            newitem._id = data['short_name'];
                                            newitem.properties = data;

                                            vs_ind.insertOne(newitem, {
                                                w: 1
                                            }, function(err, result2) {
                                                if (err) {
                                                    console.log(err);
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
        }
        function update_info(call){
            vs_csa.find().count(function(err,results){
                if(err){
                    console.log(err);
                    process.exit(0);
                }
                else{
                    num_csa = results;
                    vs_csa.findOne({},function(err,res){
                        if(err){
                            console.log(err);
                            process.exit(0);
                        }
                        else{
                            var queue = [];
                            var indicators = Object.keys(res.properties);
                            indicators.push({'done':true});
                            update(indicators);
                        }
                    });
                }
            });
            function update(data){
                async.eachSeries(data,function(d,callback) {
                    if (d.done) {
                        console.log('done');
                        call();
                    }
                    else {
                        var null_count,min_val,max_val,empty;
                        var keystr = "properties." + d;
                        var null_query = {};
                        var max_query = {};
                        var min_query = {};
                        var include = {};
                        null_query[keystr] = {'$in': ['',' ','N/A']};
                        include[keystr] = 1;
                        include['_id'] = 0;
                        max_query[keystr] = -1;
                        min_query[keystr] = 1;
                        console.log("starting... " + d);
                        vs_csa.find(null_query,include).count(function(err,res){
                            null_count = res;
                            if(null_count > num_csa / 2){empty = true;} else{empty = false;}
                            if(empty == false){
                                vs_csa.find({},include).sort(max_query).limit(1).toArray(function(err,res){
                                    if(err){console.log(err);}
                                    else{
                                        max_val = res[0].properties[d];
                                    }
                                    vs_csa.find({},include).sort(min_query).limit(1).toArray(function(err,res){
                                        if(err){console.log(err);}
                                        else{
                                            min_val = res[0].properties[d];
                                            vs_csa.find({},include).toArray(function(err,res){
                                                if(err){console.log(err);}
                                                var fc = {};
                                                fc.type = 'FeatureCollection';
                                                fc.features = [];
                                                for(var i =0; i < res.length; i++){
                                                    var tmp = {};
                                                    tmp.type = 'Feature';
                                                    tmp.properties = {};
                                                    if(res[i].properties[d] == ''){
                                                        continue;
                                                    }
                                                    tmp.properties[d] = parseFloat(res[i].properties[d]);
                                                    fc.features.push(tmp);

                                                    //console.log(fc.features[i].properties);
                                                }
                                                var breaks = turf.jenks(fc, d, num_intervals);
                                                var intervals = [];
                                                for(var i = 1 ; i < breaks.length ; i++){
                                                    intervals.push([breaks[i-1],breaks[i]]);
                                                }

                                                write(d,false,null_count,min_val,max_val,intervals,callback);
                                            });
                                        }
                                    });
                                });
                            }
                            else{
                                write(d,true,null_count,null,null,null,callback);
                            }
                            //setImmediate(callback);
                        });

                    }
                });
            }
            function write(indicator,empty,nullcount,min_val,max_val,intervals,cb){
                var item = {};
                item['_id'] = indicator;
                var props = {};
                props['empty'] = empty;
                props['nullcount'] = nullcount;
                props['min'] = min_val;
                props['max'] = max_val;
                props['intervals'] = intervals;
                item.properties = props;
                vs_ind.findOne({'_id':indicator},function(err,res){
                    if(err){console.log(err);setImmediate(cb);}
                    else if(res == null){
                        console.log("no info for " + indicator + " ... adding info!");
                        vs_ind.insertOne(item,{
                            w: 1
                        },function(err,res){
                            if(err){console.log(err); setImmediate(cb);}
                            else{
                                setImmediate(cb);
                            }
                        });
                    }
                    else{
                        console.log("updating info for " + indicator);
                        for(key in res.properties){
                            item.properties[key] = res.properties[key];
                        }
                        vs_ind.updateOne({_id:indicator},item,function(err,res){
                            if(err){console.log(err); console.log(indicator + " fail");setImmediate(cb);}
                            else{
                                console.log(indicator + " success");
                                setImmediate(cb);
                            }
                        });
                    }
                });
            }
        }
        function update_csas(call){
            vs_ind.find({}).toArray(function(err,res){
                console.log("------");
                console.log("------");
                var queue = [];
                for(var i = 0; i < res.length; i++){
                    if(res[i]['_id'] != '' && res[i]['_id'] != ' '){
                        queue.push(res[i]);
                    }
                }
                queue.push({'done':true});
                update(queue);
            });
            function update(data){
                async.eachSeries(data,function(d,callback) {
                    if (d.done) {
                        console.log('done');
                        csas.find().toArray(function(err,res){
                            //console.log(res);
/*                            for(var i = 0; i < res.length; i++){
                                console.log(res[i].properties.vsdata);
                            }*/
                            call();
                        });
                        setImmediate(function () {
                            callback();
                        });
                    }
                    else{
                        if(d.properties.empty == true){
                            var update_query = {};
                            var prop_str = "properties.vsdata." + d['_id'];
                            update_query['$set'] = {};
                            update_query['$set'][prop_str] = {};
                            update_query['$set'][prop_str].value = null;
                            csas.updateMany({},update_query,{'multi':true},function(err,res){
                               if(err){console.log(err); }
                                setImmediate(callback);
                            });
                        }
                        else{
                            vs_ind.findOne({'_id':d['_id']},function(err,res){
                                if(err){console.log(err); setImmediate(callback);}
                                else{
                                    var queue = [];
                                    var colors = [];
                                    colors[0] = res.properties.color1;
                                    colors[1] = res.properties.color2;
                                    colors[2] = res.properties.color3;
                                    colors[3] = res.properties.color4;
                                    colors[4] = res.properties.color5;

                                    for(var i = 0; i < res.properties.intervals.length; i++){
                                        var inter = [];
                                        for(var j = 0; j < res.properties.intervals[i].length; j++){
                                            inter[j] = res.properties.intervals[i][j];
                                        }
                                        if(i == res.properties.intervals.length - 1){
                                            var func = write_interval_constructor(d['_id'],inter,[true,true],colors[i],i);
                                            queue.push(func);
                                        }
                                        else{
                                            var func = write_interval_constructor(d['_id'],inter,[true,false],colors[i],i);
                                            queue.push(func);
                                        }
                                    }
                                    async.series(queue,function(err,results){
                                        if(err){console.log(err);}
                                        setImmediate(callback);
                                    });
                                }
                            });
                        }
                    }
                });

                function write_interval_constructor(id,interval,open,color,index){
                    function do_stuff(cb){
                        var filter = {};
                        var prop_str = 'properties.vsdata.' + id + '.value';
                        var color_str = 'properties.vsdata.' + id + '.break_color';
                        var breaknum_str = 'properties.vsdata.' + id + '.break_num';
                        var breakint_str = 'properties.vsdata.' + id + '.break_interval';
                        var update = {};
                        update['$set'] = {};
                        update['$set'][color_str] = color;
                        update['$set'][breaknum_str] = index;
                        update['$set'][breakint_str] = interval;
                        filter[prop_str] = {};
                            if(open[0] == true){
                                filter[prop_str]['$gte'] = interval[0];
                            }
                            else{
                                filter[prop_str]['$gt'] = interval[0];
                            }
                            if(open[1] == true){
                                filter[prop_str]['$lte'] = interval[1];
                            }
                            else{
                                filter[prop_str]['$lt'] = interval[1];
                            }
                        csas.updateMany(filter,update,function(err,res){
                            if(err){console.log(err);}
                            cb();
                        });
                    }
                    return do_stuff;
                }
            }
        }
        function exit(){
            process.exit(0);
        }

    }

});