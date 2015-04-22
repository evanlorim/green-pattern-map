var fs = require('fs');
var async = require('async');
var gju = require('geojson-utils');
var trim = require('trim');

process.on('uncaughtException', function(error) {
    console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

MongoClient.connect(mongoUri, function(err1, db) {
    if (err1) throw err1;
    var csas = [
        "Allendale/Irvington/S. Hilton",
        "Beechfield/Ten Hills/West Hills",
        "Belair-Edison",
        "Brooklyn/Curtis Bay/Hawkins Point",
        "Canton",
        "Cedonia/Frankford",
        "Cherry Hill",
        "Chinquapin Park/Belvedere",
        "Fells Point",
        "Forest Park/Walbrook",
        "Claremont/Armistead",
        "Clifton-Berea",
        "Cross-Country/Cheswolde",
        "Dickeyville/Franklintown",
        "Dorchester/Ashburton",
        "Downtown/Seton Hill",
        "Edmondson Village",
        "Glen-Fallstaff",
        "Greater Charles Village/Barclay",
        "Greater Govans",
        "Highlandtown",
        "Greater Mondawmin",
        "Greater Roland Park/Poplar Hill",
        "Greater Rosemont",
        "Howard Park/West Arlington",
        "Hamilton",
        "Madison/East End",
        "Medfield/Hampden/Woodberry/Remington",
        "Harford/Echodale",
        "Inner Harbor/Federal Hill",
        "Lauraville",
        "Loch Raven",
        "Midway/Coldstream",
        "Morrell Park/Violetville",
        "Sandtown-Winchester/Harlem Park",
        "South Baltimore",
        "Mt. Washington/Coldspring",
        "North Baltimore/Guilford/Homeland",
        "Northwood",
        "Greenmount East",
        "Orangeville/East Highlandtown",
        "Unassigned -- Jail",
        "Patterson Park North And East",
        "Pimlico/Arlington/Hilltop",
        "Penn North/Reservoir Hill",
        "Poppleton/The Terraces/Hollins Market",
        "Southeastern",
        "Southern Park Heights",
        "Southwest Baltimore",
        "The Waverlies",
        "Washington Village/Pigtown",
        "Westport/Mount Winans/Lakeland",
        "Oldtown/Middle East",
        "Harbor East/Little Italy",
        "Upton/Druid Heights",
        "Midtown"
    ];
    var vs_col = db.collection('vs13');
    var sites_col = db.collection('sites');
    var csas_col = db.collection('csas');

    function augment(){
        var queue = [];
        vs_col.find().toArray(function(err,results){
            for(var i=0; i < results.length; i++) {
                var csa = results[i]._id;
                var vsdata = results[i].properties;
                var d = {csa:csa,vsdata:vsdata};
                queue.push(d);
            }
            update_data(queue);
        });
    }
    function update_data(data){
        data.push({'done':true});
        async.eachSeries(data,function(d,callback){
            if(d.done){
                console.log('done');
                end();
                setImmediate(function(){
                    callback();
                });
            }
            else{
                var csa = d.csa;
                var vsdata = {};
                for(key in d.vsdata){
                    vsdata[key] = {};
                    vsdata[key]['value'] = parseFloat(d.vsdata[key]);
                }
                csas_col.findOne({'_id':csa},{},function(err,res){
                    if(err){console.log(err);}
                    else if(res!=null){
                        csas_col.update({'_id':csa},{$set:{'properties.vsdata':vsdata}},function(e,r){
                           console.log('appended vsdata to ' + csa);
                            sites_col.find({'properties.CSA':csa},{},function(ee,rr){
                                if(ee){console.log(ee);}
                                else if(rr!=null){
                                    sites_col.update({'properties.CSA':csa},{$set:{'properties.vsdata':vsdata}},{'multi':true},function(e,r){
                                        console.log('appended vsdata to ' + csa + ' sites');
                                        setImmediate(function(){
                                            callback();
                                        });
                                    })
                                }
                            } )
                        });
                    }
                    else{
                        console.log('nothing here for ' + csa);
                        setImmediate(function(){
                            callback();
                        });
                    }
                })
            }
        })
    }
    function end(){
        process.exit(0);
    }
    augment();
});