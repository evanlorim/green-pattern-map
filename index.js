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
        case "sites":
            api.sites(req, res, cb);
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