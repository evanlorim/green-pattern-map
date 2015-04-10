var $geocoder = new google.maps.Geocoder();
var $map;
var $selects = {};


function get_csas(){
    return JSON.parse(
        $.ajax({
            type: "GET",
            url:"api/csas?uniq=1"
        }).responseText
    ).data;
}

function get_csas_layer(){
    var res = null;
    $.ajax({
        type: "GET",
        url:"api/csas"
    }).success(function(data,status){
        res = data;
    });
    return res;
}

function get_neighborhoods(){
    return JSON.parse(
        $.ajax({
            type: "GET",
            url:"api/neighborhoods?uniq=1"
        }).responseText
    ).data;
}

function get_neighborhoods_layer(){
    var res = null;
    $.ajax({
            type: "GET",
            url:"api/neighborhoods"
        }).success(function(data,status){
        res = data;
    });
    return res;
}

function add_multiselect(cont_id,id,title,apicall){
    var ret = jQuery.Deferred();
    $.get(apicall).success(function(data,s){
        if(data.data.indexOf('N/A') > -1){
            console.log('N/A');
            var ind = data.data.indexOf('N/A');
            data.data.splice(ind,1);
        }
        data.data.sort();
        data.data.push('N/A');
        var cont = d3.select(cont_id)
            .append('div')
            .attr('id',id)
            .style('margin','10px');
        var sel = cont.append('select')
            .attr('multiple','multiple')
            .attr('id',id + '_multi');
        sel.selectAll('option')
            .data(data.data)
            .enter()
            .append('option')
            .attr('value',function(d){return d;})
            .text(function(d){return d;});
        $('#'+id+'_multi').multiselect({
            maxHeight: 200,
            nonSelectedText: title,
            includeSelectAllOption: true,
            buttonWidth: '100%',
            onChange: function(option, checked, select) {
                update_sites();
            }
        });
        function get_selected(){
            var selected = d3.select('#'+id).selectAll('.multiselect').attr('title');
            if(selected == title){
                return [];
            }
            else{
                selected = selected.split(',');
                for(var i = 0; i < selected.length; i++){
                    selected[i] = selected[i].trim();
                }
                return(selected);
            }
        }
        ret.resolve({'get_selected':get_selected});
    });
    return ret.promise();
}

function append_dropdown(container,button_label,opts,dd_id,label){
    var dd_wrap = container.append('div')
        .attr('class','dd_row');
    var lab_wrap = dd_wrap.append('div')
        .attr('class','label_wrap');
    var lab = lab_wrap.append('label')
        .text(label);
    var btn_grp = dd_wrap.append('div')
        .attr('class','btn-group');
    var btn = btn_grp.append('button')
        .attr('class','btn btn-sm btn-info dropdown-toggle')
        .attr('type','button')
        .attr('data-toggle','dropdown')
        .text(button_label)
        .attr('id',dd_id);
    btn.append('span')
        .attr('class','caret');
    var opts = btn_grp.append('ul')
        .attr('class','dropdown-menu scrollable-menu')
        .selectAll('li')
        .data(opts)
        .enter()
        .append('li')
        .append('a')
        .attr('href','#')
        .text(function(d){return d;});
}


function init_selects(){
    add_multiselect('#stormwater','sw_status','Status','api/unique_sw_status').done(function(data){
        $selects.sw_status = data;
    });
    add_multiselect('#cmos','cmos_site_use','Site Uses','api/unique_cmos_site_uses').done(function(data){
        $selects.cmos_site_use = data;
    });
    add_multiselect('#stormwater','sw_bmp_type','Best Management Practices','api/unique_sw_bmp_type').done(function(data){
        $selects.sw_bmp_type = data;
    });
    add_multiselect('#neighborhoods','neighborhood_sel','Neighborhoods','api/unique_neighborhoods').done(function(data){
        $selects.neighborhoods = data;
    });
}

function collapse_help_text(){

}

function update_sites(circle_filter){
    var new_sites = [];
    var new_site_ids = [];
    var queries = [];
    var sw_status = $selects.sw_status.get_selected();
    var cmos_site_use = $selects.cmos_site_use.get_selected();
    var sw_bmp_type = $selects.sw_bmp_type.get_selected();
    var nh = $selects.neighborhoods.get_selected();
    var sw_status_q = get_selected_query_string(sw_status,'properties.status','stormwater');
    var cmos_site_use_q = get_selected_query_string(cmos_site_use,'properties.site_use','cmos');
    var sw_bmp_type_q = get_selected_query_string(sw_bmp_type,'properties.bmp_type','stormwater');
    var nh_q = get_selected_query_string(nh,'properties.neighborhood',false);
    queries.push({'done':true});
    update();
    function get_selected_query_string(selected,prop,gpb_type){
        if(selected.length < 1){
            return false;
        }
        if(gpb_type == false){
            var ret = {};
            ret[prop] = {'$in':selected};
            return ret;
        }
        var ret = {};
        ret['$and'] = [];
        ret['$and'][0] = {'properties.gpb_type':gpb_type};
        ret['$and'][1] = {};
        ret['$and'][1][prop] = {'$in':selected};
        return ret;
    }
    function get_filtered(query, callback){
        if(query == false){
            callback();
        }
        else{
            $.get('/api/filter',query,function(results,status){
                var res = results.data;
                for(var i = 0; i < res.length; i++){
                    if(new_site_ids.indexOf(res[i]._id) == -1){
                        new_site_ids.push(res[i]._id);
                        new_sites.push(res[i]);
                    }
                }
                callback();
            });
        }
    }
    function end(){
        if(circle_filter){
            $.get('api/sites_in_circle', {'center':{'latitude':circle_filter.lat, 'longitude':circle_filter.lng},km:circle_filter.km}).success(function(res,stat){
                var final_sites = [];
                var data = res.data;
                for(var i = 0; i < data.length; i++){
                    if(new_site_ids.indexOf(data[i]._id) > -1){
                        final_sites.push(data[i]);
                    }
                }
                $map.updatePoints(final_sites);
            });
        }
        else{
            $map.updatePoints(new_sites);
        }
    }
    function update() {
        async.parallel([
            function(cb){get_filtered(sw_status_q,cb)},
            function(cb){get_filtered(cmos_site_use_q,cb)},
            function(cb){get_filtered(sw_bmp_type_q,cb)},
            function(cb){get_filtered(nh_q,cb)}
            ],
            function(err,res){end();}
        );
    }
    return;
}