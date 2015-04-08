addMap();
$.get("api/sites?i=1").success(function(data,status){
    console.log(data);
});