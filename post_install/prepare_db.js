var _ = require('lodash');
var q = require('q');
var Load = require("./load.js");
var Aggregate = require("./aggregate.js");
var Mask = require("./mask.js");
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/green-registry';

/*loadResources()
    .then(function(res){
        return(aggregateData());
    })
    .then(function(res){
        return(maskData());
    })
    .then(function(res){
        console.log("END");
        process.exit(0);
    })
    .fail(function(error){
        console.log(error);
        process.exit(0);
    });*/
maskData();

function loadResources(){
    var deferred = q.defer();
    new Load({'uri':mongoUri})
        .then(function(load){
            console.log("BEGIN LOAD OPERATION");
            return(q.all([
                load.loadWatersheds(),
                load.loadNeighborhoods(),
                load.loadCsas(),
                load.loadSites(),
                load.loadVitalSigns()
            ]).spread(function(ws_res,nh_res,csa_res,site_res,vs_res){
                return({
                    watersheds:ws_res,
                    neighborhoods:nh_res,
                    csas:csa_res,
                    sites:site_res,
                    vs:vs_res,
                    'load':load
                });
            }));
        })
        .then(function(data){
            console.log("END LOAD OPERATION");
            data.load.disconnect();
            deferred.resolve(data);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
}

function aggregateData(){
    var deferred = q.defer();
    var _disconnect;
    var aggregate;
    new Aggregate({'uri':mongoUri})
        .then(function(obj) {
            aggregate = obj;
            var deferred = q.defer();
            _disconnect = aggregate.disconnect;
            console.log("BEGIN AGGREGATE OPERATION");
            return(aggregate.assignWatershedsSites());
        })
        //fix this nonsense to async later
        .then(function(ws_res){
            return(aggregate.assignNeighborhoodsSites());
        })
        .then(function(nh_res){
            return(aggregate.assignCsasSites());
        })
        .then(function(csa_res){
            return(aggregate.assignVsCsas());
        })
        .then(function(results){
            console.log("END AGGREGATE OPERATION");
            _disconnect();
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
}

function maskData(){
    var deferred = q.defer();
    var _disconnect;
    var mask;
    new Mask({'uri':mongoUri})
        .then(function(obj){
            mask = obj;
            var deferred = q.defer();
            _disconnect = mask.disconnect;
            console.log("BEGIN MASK OPERATION");
            return mask.craftCmosAccess();
        })
        .then(function(data){
            return mask.craftStormwaterAccess();
        })
        .then(function(data){
            return mask.craftNeighborhoodAccess();
        })
        .then(function(data){
            return mask.craftCsaAccess();
        })
        .then(function(data){
            return mask.craftWatershedAccess();
        })
        .then(function(data){
            return mask.craftVitalSignsAccess();
        })
        .then(function(data){
            console.log("END MASK OPERATION");
            _disconnect();
            deferred.resolve(results);
            //console.log(data);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
}


function test(){
    var deferred = q.defer();
    var _disconnect;
    var aggregate;
    new Aggregate({'uri':mongoUri})
        .then(function(obj) {
            aggregate = obj;
            var deferred = q.defer();
            _disconnect = aggregate.disconnect;
            console.log("BEGIN AGGREGATE OPERATION");
            return(aggregate.assignVsCsas());
        })
        .then(function(results){
            console.log("END AGGREGATE OPERATION");
            _disconnect();
            deferred.resolve(results);
        })
        .fail(function(error){
            deferred.reject(new Error(error));
        });
    return deferred.promise;
}











