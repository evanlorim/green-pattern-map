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

Api.prototype.getAccessData = function(){
    var deferred = q.defer();
    this.utils.query({},{},'access').then(function(results){
        deferred.resolve(results);
    });
    return deferred.promise;
};

Api.prototype.getAccessSelectors = function(){
    var deferred = q.defer();
    this.utils.query({},{},'access_selectors').then(function(results){
        deferred.resolve(results);
    })
    return deferred.promise;
};

Api.prototype.findSites = function(site_ids,radiusfilter){
    var deferred = q.defer();
    var self = this;
    this.utils.findSites(site_ids)
        .then(function(response){
            if(radiusfilter){
                return self.utils.pointsInRadius(response,radiusfilter);
            }
            else{
                return response;
            }
        }).then(function(response2){
            deferred.resolve(response2);
        });
    return deferred.promise;
};

Api.prototype.findGeo = function(collection,obj_ids){
    var deferred = q.defer();
    this.utils.findGeo(collection,obj_ids)
        .then(function(response){deferred.resolve(response)});
    return deferred.promise;
}

module.exports = Api;