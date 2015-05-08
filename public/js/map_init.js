getAccess().then(function(A){
    var M = new Map();
    M.initialize();
    var dm = new DomManipulator(A,M);
    dm.initialize();
});

