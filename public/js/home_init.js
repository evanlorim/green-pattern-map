

$('#getstarted').on('click',function(){
    $.get('map').success(function(){
        window.location.href = window.location.href + "map";
    });
});