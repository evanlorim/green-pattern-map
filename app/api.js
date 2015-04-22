var mongo = require('mongodb');
var utils = require('./utils.js');

var Api = function(config){
    for(var prop in config){
        this[prop] = config[prop];
    }
    this.utils = new utils(this);
};


Api.prototype.filter = function(req,res,cb){
    this.utils.query(res, 'sites', req.query, 'json', cb);
};

Api.prototype.multifilter = function(req,res,cb){
    this.utils.filterz(res, "sites", req.query, 'json', cb,req.opts);
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

Api.prototype.unique_neighborhoods = function(req,res,cb){
    this.utils.unique(res, 'neighborhoods', 'properties.Name',{}, 'json', cb, true);
};

Api.prototype.csas = function(req,res,cb){
    this.utils.query(res, 'csas', {}, 'geojson', cb);
};

Api.prototype.unique_csas = function(req,res,cb){
    this.utils.unique(res, 'csas', 'properties.name', {}, 'json', cb, true);
};

Api.prototype.unique_indicators = function(req,res,cb){
    this.utils.query(res, 'vs13_indicators', {},'json',cb,{'_id':0,'properties.full_name':1,'properties.short_name':1});
};

Api.prototype.watersheds = function(req, res, cb) {
    this.utils.query(res, 'watersheds', {}, 'geojson', cb);
};

Api.prototype.unique_watersheds = function(req,res,cb){
    this.utils.unique(res, 'watersheds', 'properties.MDE8NAME', {}, 'json', cb, true);
};

Api.prototype.indicator_info = function(req,res,cb){
    console.log("performing this query");
    this.utils.query(res,'vs13_indicators', {}, 'json', cb);
}

module.exports = Api;
