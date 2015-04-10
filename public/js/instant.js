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

