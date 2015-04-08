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

    function augment(){
        var queue = [];
        var vs_col = db.collection('vs');
        var sites_col = db.collection('sites');
        var csas_col = db.collection('csa-polygons');
        vs_col.find().toArray(function(err,results){
            var info = [];
            for(var i=0; i < results.length; i++) {
                var csa = results[i]._id;
                sites.findOne({'_id': id}, {}, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                }
            );
            }});
            get_polys(info);
        }
        function get_polys(site_info){
            polys = {};
            for(var i=0; i < csas.length; i++){
                polys[csas[i]] = [];
            }
            csa_poly.find().toArray(function(err,results){
                for(var i=0; i < results.length; i++){
                    polys[results[i].properties.name].push(results[i].geometry);
                }
                search_polys(site_info,polys);
            });
        }
        function search_polys(site_info,polys){
            var res = [];
            for(var i = 0; i < site_info.length; i++){
                console.log(i + "/" + site_info.length);
                var site = site_info[i];
                var found = false;
                for(var j = 0; j < csas.length; j++){
                    var csa = csas[j];
                    var p = polys[csa];
                    //console.log(p);
                    for(var k = 0; k < p.length; k++){
                        var tmp = gju.pointInPolygon(site.point,p[k]);
                        if(tmp == true){
                            res.push({'id':site.id,'csa':csa});
                            found = true;
                            break;
                        }
                    }
                    if(found == true){
                        break;
                    }
                }
                if(found == false){
                    res.push({'id':site.id,'csa':'N/A'})
                }
            }
            update_sites(res);
        }

        function update_sites(data){
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
                    var id = d.id;
                    var csa = d.csa;
                    //console.log(id + "//" + csa);
                    sites.findOne({'_id':id},{},function(err,result){
                        if(err){
                            console.log(err);
                            setImmediate(function(){
                                callback();
                            });
                        }
                        else{
                            console.log(result);
                            if(result != null){
                                sites.update({_id:id},{$set: {'properties.CSA':csa}}, function(){
                                    setImmediate(function(){
                                        callback();
                                    });
                                });
                            }
                            else if(result==null){
                                console.log('no entry?');
                                setImmediate(function() {
                                    callback();
                                });
                            }
                            else{
                                console.log("something went way wrong");
                                setImmediate(function() {
                                    callback();
                                });
                            }
                        }
                    })
                }
            });
        }

        function end(){
            process.exit(0);
        }
    //ghmmmm
    augment();
});