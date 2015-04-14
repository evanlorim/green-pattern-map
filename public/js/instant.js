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

var tmp2 = [];
tmp2.push({'$and':[
    {'properties.gpb_type':'stormwater'},
    {'properties.bmp_type':{'$in':["Bioretention Area", 'Dry Swale']}}
]});
tmp2.push({'$and':[
    {'properties.gpb_type':'cmos'},
    {'properties.site_use':{'$in':["ADOPT A LOT", 'Art Inc']}}
]});

var tmp = {};
tmp.query = tmp2;


$.ajax({
    type: "POST",
    url:'api/multifilter',
    contentType:'application/json',
    data: JSON.stringify(tmp),
    success:function(d){console.log(d);}
});

