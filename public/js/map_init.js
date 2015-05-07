getAccess().then(function(A){
    var M = new Map();
    var dm = new DomManipulator(A,M);
    dm.initialize();
});

