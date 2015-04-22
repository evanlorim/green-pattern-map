$map = addMap();

init_selects();

$('.reveal').click(function(){
    $(this).slideUp(100);
    $(this).next().slideToggle();
    $(".collapse").slideDown(100);
});
$('.collapse').click(function() {
    $(this).slideUp(100);
    $(this).prev().slideToggle();
    $(".reveal").slideDown(100);
});


function ds(shortname){
    $map.display_vs(true,shortname);
}

function ds1(){
    ds('mort84_13');
}

function ds2(){
    ds('abse13');
}

function ds3(){
    ds('neibus13');
}

function ds4(){
    ds('shomes13');

}

function ds5(){
    ds('weather13');
}

function ds6(){
    ds('leadtest13');
}

function ds7(){
    ds('ebll13');
}

function nods(){
    $map.display_vs(false);
}

setTimeout(nods,5000);

//var wm = new Watermap();


