var mongo = require('mongodb');
var utils = require('./utils.js');

var Api = function(config){
    for(var prop in config){
        this[prop] = config[prop];
    }
    this.utils = new utils(this);
};


Api.prototype.filter = function(req,res,cb){
    console.log(req.query);
    this.utils.query(res, 'sites', req.query, 'json', cb);
};

Api.prototype.unique_sw_bmp_type = function(req,res,cb){
    this.utils.unique(res, 'sites', 'properties.bmp_type', {'properties.gpb_type':'stormwater'}, 'json', cb, true);
};

Api.prototype.unique_sites = function(req,res,cb){
    this.utils.query(res, 'sites', {}, 'geojson', cb);
};

Api.prototype.unique_neighborhoods = function(req, res, cb) {
    this.utils.query(res, 'neighborhoods', {}, 'geojson', cb);
};

Api.prototype.geom_neighborhoods = function(req,res,cb){
    this.utils.unique(res, 'neighborhoods', 'properties.Name', {}, 'json', cb, false);
};

Api.prototype.unique_csas = function(req, res, cb) {
    this.utils.unique(res, 'csas', 'properties.name', {}, 'json', cb, false);
};

Api.prototype.geom_csas = function(req,res,cb){
    this.utils.query(res, 'csas', {}, 'geojson', cb);
};

Api.prototype.sites_in_circle = function(req,res,cb){
    this.utils.in_circle(req.query.center,req.query.km,cb);
};

Api.prototype.unique_cmos_site_uses = function(req,res,cb){
    this.utils.unique(res, 'sites', 'properties.site_use', {'properties.gpb_type':'cmos'},'json', cb, true);
};

Api.prototype.unique_cmos_orgs = function(req,res,cb){
    this.utils.unique(res, 'sites', 'properties.organizations', {'properties.gpb_type':'cmos'}, 'json', cb, true);
};

Api.prototype.unique_sw_status = function(req,res,cb){
    this.utils.unique(res, 'sites', 'properties.status', {'properties.gpb_type':'stormwater'}, 'json', cb, true);
};

Api.prototype.neighborhoods = function(req,res,cb){
    this.utils.query(res, 'neighborhoods', {}, 'geojson', cb);
};

Api.prototype.csas = function(req,res,cb){
    this.utils.query(res, 'csas', {}, 'geojson', cb);
};

Api.prototype.watersheds = function(req, res, cb) {

    this.doBoundsSearch(req, res, cb, [
        [-76.711293669970217, 39.371957030672938],
        [-76.52967423510151, 39.371971900043278],
        [-76.529858300949158, 39.209622953304475],
        [-76.549725312649713, 39.197233450625106],
        [-76.583673126628199, 39.208120531796183],
        [-76.61161075881013, 39.234394547529099],
        [-76.711161349110256, 39.277838496606982],
        [-76.711293669970217, 39.371957030672938]
    ], 'watersheds', 'LineString');

};

Api.prototype.doBoundsSearch = function(req, res, cb, bounds, collection, type) {

    var query = {
        "geometry": {
            "$geoIntersects": {
                "$geometry": {
                    type: (type) ? type : "Polygon",
                    coordinates: bounds
                }
            }
        }
    };

    console.log(JSON.stringify(query));

    this.utils.query(res, collection, query, 'geojson', cb);

};
module.exports = Api;
