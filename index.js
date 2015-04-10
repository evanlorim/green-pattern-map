var express = require('express');
var Api = require('./app/api.js');
var app = express();
var fs = require('fs');
var http = require('http').Server(app);

var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

app.set('view engine', 'jade');

app.use('/public', express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));

app.get('/api/:type', function(req, res) {
    var api = new Api({
        mongoUri: mongoUri
    });
    var cb = function(resp) {
        res.json(resp);
    };
    switch (req.params.type) {
        case "filter":
            api.filter(req,res,cb);
            break;
        case "unique_sites":
            api.unique_sites(req, res, cb);
            break;
        case "unique_neighborhoods":
            api.unique_neighborhoods(req,res,cb);
            break;
        case "unique_csas":
            api.unique_csas(req,res,cb);
            break;
        case "geom_neighborhoods":
            api.geom_neighborhoods(req,res,cb);
            break;
        case "geom_csas":
            api.geom_csas(req,res,cb);
            break;
        case "sites_in_circle":
            console.log('sites in circ');
            api.sites_in_circle(req,res,cb);
            break;
        case "unique_cmos_site_uses":
            api.unique_cmos_site_uses(req,res,cb);
            break;
        case "unique_cmos_orgs":
            api.unique_cmos_orgs(req,res,cb);
            break;
        case "unique_sw_status":
            api.unique_sw_status(req,res,cb);
            break;
        case "unique_sw_bmp_type":
            api.unique_sw_bmp_type(req,res,cb);
            break;
        default:
            cb({
                data: [],
                results: 0,
                success: false,
                error: ['API method unknown']
            });
    }
});

app.get('/', function(request, response) {
    response.render('index');
});

http.listen(process.env.PORT || 5000, function() {
    console.log("App listening on " + (process.env.PORT || 5000));
});