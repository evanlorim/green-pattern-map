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
    var neighborhoods =  [
        "Abell",
        "Allendale",
        "Arcadia",
        "Arlington",
        "Armistead Gardens",
        "Ashburton",
        "Baltimore Highlands",
        "Patterson Park Neighborhood",
        "Barclay",
        "Barre Circle",
        "Beechfield",
        "Belair-Parkside",
        "Bellona-Gittings",
        "Berea",
        "Better Waverly",
        "Beverly Hills",
        "Biddle Street",
        "Blythewood",
        "Bolton Hill",
        "Boyd-Booth",
        "Brewers Hill",
        "Bridgeview\/Greenlawn",
        "Broadway East",
        "Broening Manor",
        "Brooklyn",
        "Burleith-Leighton",
        "Butcher's Hill",
        "Callaway-Garrison",
        "Cameron Village",
        "Canton",
        "Canton Industrial Area",
        "Carroll - Camden Industrial Area",
        "Carroll Park",
        "Carroll-South Hilton",
        "Carrollton Ridge",
        "Cedarcroft",
        "Cedmont",
        "Cedonia",
        "Central Forest Park",
        "Central Park Heights",
        "Charles North",
        "Cherry Hill",
        "Cheswolde",
        "Chinquapin Park",
        "Orchard Ridge",
        "Clifton Park",
        "Coldspring",
        "Coldstream Homestead Montebello",
        "Concerned Citizens Of Forest Park",
        "Coppin Heights\/Ash-Co-East",
        "Cross Country",
        "Cross Keys",
        "Curtis Bay",
        "Curtis Bay Industrial Area",
        "Cylburn",
        "Darley Park",
        "Dickeyville",
        "Dolfield",
        "Dorchester",
        "Downtown",
        "Druid Heights",
        "Druid Hill Park",
        "Dunbar-Broadway",
        "Dundalk Marine Terminal",
        "East Arlington",
        "East Baltimore Midway",
        "Easterwood",
        "Eastwood",
        "Edmondson Village",
        "Ednor Gardens-Lakeside",
        "Ellwood Park\/Monument",
        "Evergreen",
        "Evergreen Lawn",
        "Fairfield Area",
        "Fairmont",
        "Fallstaff",
        "Federal Hill",
        "Fells Point",
        "Forest Park",
        "Forest Park Golf Course",
        "Frankford",
        "Franklin Square",
        "Franklintown",
        "Franklintown Road",
        "Garwyn Oaks",
        "Gay Street",
        "Glen",
        "Glen Oaks",
        "Glenham-Belhar",
        "Graceland Park",
        "Greektown",
        "Greenmount Cemetery",
        "Greenmount West",
        "Greenspring",
        "Grove Park",
        "Guilford",
        "Gwynns Falls",
        "Gwynns Falls\/Leakin Park",
        "Hampden",
        "Hanlon-Longwood",
        "Hamilton Hills",
        "Harlem Park",
        "Harwood",
        "Hawkins Point",
        "Heritage Crossing",
        "Herring Run Park",
        "Highlandtown",
        "Hillen",
        "Hoes Heights",
        "Holabird Industrial Park",
        "Hollins Market",
        "Homeland",
        "Hopkins Bayview",
        "Howard Park",
        "Hunting Ridge",
        "Idlewood",
        "Inner Harbor",
        "Irvington",
        "Johns Hopkins Homewood",
        "Johnston Square",
        "Jones Falls Area",
        "Jonestown",
        "Bayview",
        "Kenilworth Park",
        "Kernewood",
        "Keswick",
        "Kresson",
        "Lake Evesham",
        "Lake Walker",
        "Lakeland",
        "Langston Hughes",
        "Lauraville",
        "Levindale",
        "Liberty Square",
        "Little Italy",
        "Loch Raven",
        "Locust Point",
        "Locust Point Industrial Area",
        "Lower Herring Run Park",
        "Loyola\/Notre Dame",
        "Lucille Park",
        "Madison Park",
        "Madison-Eastend",
        "Mayfield",
        "McElderry Park",
        "Medfield",
        "Medford",
        "Mid-Govans",
        "Mid-Town Belvedere",
        "Middle Branch\/Reedbird Parks",
        "Middle East",
        "Midtown-Edmondson",
        "Millhill",
        "Milton-Montford",
        "Mondawmin",
        "Montebello",
        "Moravia-Walther",
        "Morgan Park",
        "Morgan State University",
        "Morrell Park",
        "Mosher",
        "New Southwest\/Mount Clare",
        "Mount Holly",
        "Mount Vernon",
        "Mount Washington",
        "Mount Winans",
        "Mt Pleasant Park",
        "New Northwood",
        "North Harford Road",
        "North Roland Park\/Poplar Hill",
        "Northwest Community Action",
        "O'Donnell Heights",
        "Oakenshawe",
        "Oaklee",
        "Oldtown",
        "Oliver",
        "Orangeville",
        "Orangeville Industrial Area",
        "Original Northwood",
        "Otterbein",
        "Overlea",
        "Panway\/Braddish Avenue",
        "Park Circle",
        "Parklane",
        "Parkside",
        "Parkview\/Woodbrook",
        "Patterson Park",
        "Patterson Place",
        "Pen Lucy",
        "Penn North",
        "Penn-Fallsway",
        "Penrose\/Fayette Street Outreach",
        "Perkins Homes",
        "Perring Loch",
        "Pimlico Good Neighbors",
        "Pleasant View Gardens",
        "Poppleton",
        "Port Covington",
        "Pulaski Industrial Area",
        "Purnell",
        "Radnor-Winston",
        "Ramblewood",
        "Reisterstown Station",
        "Remington",
        "Reservoir Hill",
        "Richnor Springs",
        "Ridgely's Delight",
        "Riverside",
        "Rognel Heights",
        "Roland Park",
        "Rosebank",
        "Rosemont",
        "Rosemont East",
        "Rosemont Homeowners\/Tenants",
        "Sabina-Mattfeldt",
        "Saint Agnes",
        "Saint Helena",
        "Saint Josephs",
        "Saint Paul",
        "Sandtown-Winchester",
        "South Baltimore",
        "Seton Business Park",
        "Seton Hill",
        "Sharp-Leadenhall",
        "Shipley Hill",
        "South Clifton Park",
        "Spring Garden Industrial Area",
        "Stadium Area",
        "Stonewood-Pentwood-Winston",
        "Taylor Heights",
        "Ten Hills",
        "The Orchards",
        "Towanda-Grantley",
        "Tremont",
        "Tuscany-Canterbury",
        "Union Square",
        "University Of Maryland",
        "Uplands",
        "Upper Fells Point",
        "Upton",
        "Villages Of Homeland",
        "Violetville",
        "Wakefield",
        "Walbrook",
        "Waltherson",
        "Washington Hill",
        "Washington Village\/Pigtown",
        "Waverly",
        "West Arlington",
        "West Forest Park",
        "West Hills",
        "Westfield",
        "Westgate",
        "Westport",
        "Wilson Park",
        "Winchester",
        "Windsor Hills",
        "Winston-Govans",
        "Woodberry",
        "Woodbourne Heights",
        "Woodbourne-McCabe",
        "Woodmere",
        "Wyman Park",
        "Wyndhurst",
        "Yale Heights",
        "Lower Edmondson Village",
        "Wilhelm Park",
        "Edgewood",
        "Evesham Park",
        "Belvedere",
        "Wrenlane",
        "York-Homeland",
        "CARE",
        "Downtown West",
        "Belair-Edison",
        "Four By Four",
        "Charles Village",
        "Old Goucher"
    ];
    var sites = db.collection('sites');
    function augment(){
        var queue = [];
        var sites = db.collection('sites');
        var nh_poly = db.collection('neighborhoods');
        sites.find().toArray(function(err,results){
            var info = [];
            for(var i=0; i < results.length; i++){
                if(results[i].properties.site_id === undefined || results[i].properties.site_id === '' || results[i].geometry === undefined){
                    continue;
                }
                var p = {'id':results[i]._id,'point':results[i].geometry};
                info.push(p);
            }
            get_polys(info);
        });
        function get_polys(site_info){
            polys = {};
            for(var i=0; i < neighborhoods.length; i++){
                polys[neighborhoods[i]] = [];
            }
            nh_poly.find().toArray(function(err,results){
                for(var i=0; i < results.length; i++){
                    polys[results[i].properties.Name].push(results[i].geometry);
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
                for(var j = 0; j < neighborhoods.length; j++){
                    var nh = neighborhoods[j];
                    var p = polys[nh];
                    //console.log(p);
                    for(var k = 0; k < p.length; k++){
                        var tmp = gju.pointInPolygon(site.point,p[k]);
                        if(tmp == true){
                            console.log('found');
                            res.push({'id':site.id,'nh':nh});
                            found = true;
                            break;
                        }
                    }
                    if(found == true){
                        break;
                    }
                }
                if(found == false){
                    res.push({'id':site.id,'nh':'N/A'})
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
                    var nh = d.nh;
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
                                sites.update({_id:id},{$set: {'properties.neighborhood':nh}}, function(){
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
    }
    augment();

});