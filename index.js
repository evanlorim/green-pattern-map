var express = require('express');
var Api = require('./app/api.js');
var app = express();
var http = require('http').Server(app);
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

app.set('view engine', 'jade');

app.use('/public', express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').json());

app.get('/api/:type', function(request, response){
    var api = new Api({
        mongoUri: mongoUri
    });
    var callback = function(data){
        response.json(data);
    };
    switch(request.params.type){
        case "access_data":
            api.getAccessData()
                .then(function(data){
                    return callback({data:data});
                });
            break;
        case "access_selectors":
            api.getAccessSelectors()
                .then(function(data){
                    return callback({data:data});
                });
            break;
        default:
            callback({
                data: [],
                results: 0,
                success: false,
                error: ['API method unknown']
            });
    }
});

app.post('/api/:type', function(request, response){
    var api = new Api({
        mongoUri: mongoUri
    });
    var callback = function(data){
        response.json(data);
    };
    console.log(request.params.type);
    if(request.params.type == 'findsites'){
        console.log(request.body.site_doc_ids);
        api.findSites(request.body.site_doc_ids)
            .then(function(results){
                return callback({data:results});
            });
    }
    else if(request.params.type == 'findgeo'){
        //console.log(request.body.site_ids);
        console.log(request.body.obj_ids);
        api.findGeo(request.body.collection,request.body.geo_doc_ids)
            .then(function(results){
                return callback({data:results});
            });
    }
    else{
        return callback({
            data: [],
            results: 0,
            success: false,
            error: ['API method unknown']
        });
    }
});

app.get('/', function(request, response){
    response.render('home');
});

app.get('/map',function(request, response){
    console.log("Rendering map...");
    response.render('map');
    console.log('Done');
});

http.listen(process.env.PORT || 5000, function() {
    console.log("App listening on " + (process.env.PORT || 5000));
});

