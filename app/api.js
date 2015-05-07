var q = require('q');
var _ = require('lodash');
var utils = require('./utils.js');

var Api = function(config){
    //instantiation -- copying things like the mongoUri
    for(var prop in config){
        this[prop] = config[prop];
    }
    this.utils = new utils(config);
};

Api.prototype.test = function(request,response,callback){
    this.utils.test(response,callback);
};

Api.prototype.getAccessLayer = function(id){
    var deferred = q.defer();
    switch(id){
        case 'watersheds':
            this.utils.query({'id':'watersheds'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        case 'neighborhoods':
            this.utils.query({'id':'neighborhoods'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        case 'csas':
            this.utils.query({'id':'csas'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        case 'cmos':
            this.utils.query({'id':'cmos'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        case 'stormwater':
            this.utils.query({'id':'stormwater'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        case 'vitalsigns':
            this.utils.query({'id':'vitalsigns'},{},'access')
                .then(function(response){deferred.resolve(response[0])});
            break;
        default:
            deferred.resolve("Not a valid access layer!");
            break;
    }
    return deferred.promise;
};

Api.prototype.findSites = function(site_ids){
    var deferred = q.defer();
    this.utils.findSites(site_ids)
        .then(function(response){deferred.resolve(response)});
    return deferred.promise;
};

Api.prototype.findGeo = function(collection,obj_ids){
    var deferred = q.defer();
    this.utils.findGeo(collection,obj_ids)
        .then(function(response){deferred.resolve(response)});
    return deferred.promise;
}

module.exports = Api;