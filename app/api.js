var mongo = require('mongodb');
var utils = require('./utils.js');

var Api = function(config){
    for(var prop in config){
        this[prop] = config[prop];
    }
    this.utils = new utils(this);
};

Api.prototype.sites = function(req,res,cb){
    var me  = this;
    this.utils.query(res, 'sites', {}, 'geojson', cb);
};

Api.prototype.filter = function(req,res,cb){

};

module.exports = Api;
