
DomManipulator = function(access,map){
    this.access = access;
    this.map = map;

    this.panel = {};
    this.navi = {};

    this.geocoder = new google.maps.Geocoder();

    this.searches = {};
    this.searches.cmos_titles = access.cmos.titles.index;
    this.searches.csa_titles = access.csas.titles.index;
    this.searches.neighborhood_titles = access.neighborhoods.titles.index;
    this.searches.watershed_titles = access.watersheds.titles.index;

};

DomManipulator.prototype.initialize = function(){
    var self = this;

    //reset all checkboxes
    $('input').each(function()
    {
        this.checked = false;
    });

    //clear all form data

    $('#search-address').typeahead({
        hint:false,
        highlight:true
    },{
        name: 'addresses',
        source:self.googleGeocode()
        }
    );

    $('#search-sitename').typeahead({
        hint:false,
        highlight:true,
        minLength:1
    },{
        name: 'cmos_titles',
        source: self.substringMatcher(self.searches.cmos_titles)
    });

    $('#search-csa').typeahead({
        hint:false,
        highlight:true,
        minLength:1
    },{
        name: 'csa_titles',
        source: self.substringMatcher(self.searches.csa_titles)
    });

    $('#search-neighborhood').typeahead({
        hint:false,
        highlight:true,
        minLength:1
    },{
        name: 'neighborhood_titles',
        source: self.substringMatcher(self.searches.neighborhood_titles)
    });

    $('#search-watershed').typeahead({
        hint:false,
        highlight:true,
        minLength:1
    },{
        name: 'watershed_titles',
        source: self.substringMatcher(self.searches.watershed_titles)
    });

    $('#search-select li').on('click',function(){
        self.switchSearch($(this)[0].textContent);
    });

    $('#site-select li').on('change',function(){
        var label = $(this)[0].textContent;
        var checked = $(this).find('input').is(':checked');
        self.switchSite(label,checked);
    });

    $('#layer-select li').on('change',function(){
        self.switchLayer($(this)[0].textContent);
    });

    self.appendConfigOptions('#cmos-config','cmos-config-uses','site-config-selector','Site Uses',self.access.cmos.uses.index);
    self.appendConfigOptions('#stormwater-config','stormwater-config-bmps','site-config-selector', 'Best Management Practices', self.access.stormwater.bmps.index);
    self.appendConfigOptions('#stormwater-config','stormwater-config-statuses','layer-config-selector', 'Statuses', self.access.stormwater.statuses.index);
    self.appendConfigOptions('#csas-config','csas-config-titles','layer-config-selector','Titles',self.access.csas.titles.index);
    self.appendConfigOptions('#watersheds-config','watersheds-config-titles','layer-config-selector', 'Titles',self.access.watersheds.titles.index);
    self.appendConfigOptions('#neighborhoods-config','neighborhoods-config-titles','layer-config-selector','Titles',self.access.neighborhoods.titles.index);


    $('.config-options-entry').on('change',function(){
        $(document).trigger('mapUpdateEvent');
    });

    self.activatePanelClosing();

    $(document).on('mapUpdateEvent',function(){
        self.updateSites().then(function(){
                self.updateLayers();
        });
    });

    $(document).on('filterEvent',function(event,data){
        self.switchLegend(data);
    });

};

DomManipulator.prototype.switchLegend = function(filter){
    var self = this;
    var query = filter.query;
    var legend = d3.select('#legend-panel');
    legend.selectAll('*').remove();
    if(query.gpb || query.geo){
        legend.style('display','block');
    }
    if(query.gpb){
        var div = legend.append('div');
        var divs = div.selectAll('div')
            .data(_.pairs(query.gpb))
            .enter()
            .append('div')
            .attr('class','legend-containers');
        var headers = divs.append('h4')
            .text(function(d){return d[0];});
        var items = divs.append('div').attr('class','selector well well-sm');
        items.each(function(d){
            var item = d3.select(this);
            if(d[1].filters){
                var active = filter.getActiveGpbTypeFilters(d[0]);
                if(active.length > 0){
                    var list_items = item.selectAll('p')
                        .data(active)
                        .enter()
                        .append('p')
                        .text(function(d){return d.type});
                    if(active.length == 1){
                        var check = item.insert('div',':first-child')
                            .attr('class','checkbox')
                            .append('label')
                            .attr('class','legend-entry options-entry differentiator');
                        var sub_check = check.append('input')
                            .attr('type','checkbox');
                        sub_check.on('click',function(){
                            var checked = d3.select(this).property('checked');
                            if(checked){
                                list_items.each(function(d){
                                    var li = d3.select(this);
                                    var ul = li.append('ul');
                                    ul.selectAll('li')
                                        .data(d.values)
                                        .enter()
                                        .append('li')
                                        .text(function(d){console.log(d);return d;});
                                })
                            }
                            else{
                                list_items.selectAll('ul')
                                    .remove();
                            }
                        });
                        check.append('p').append('i')
                            .text('Differentiate');
                    }
                }
            }
        })
    }
    else{
        legend.style('display','none');
    }
    $('.differentiator').on('change',function(){
        var checked = $(this).find('input').prop('checked');
        if(checked){

        }
    })
};

DomManipulator.prototype.switchSearch = function(selection){
    var self = this;

    var swap = {
        'Addresses' : 'search-address',
        'Site Names': 'search-sitename',
        'Community Statistical Areas': 'search-csa',
        'Neighborhoods': 'search-neighborhood',
        'Watersheds': 'search-watershed'
    };

    var search_id = swap[selection];
    if(search_id === undefined){return;}

    d3.selectAll('.search-switch')
        .style('display',function(){
            var id = d3.select(this).attr('id');
            if(id == search_id){
                return 'inline-block';
            }
            else{
                return 'none';
            }
        });
};

DomManipulator.prototype.switchLayer = function(selection){
    var self = this;

    var swap = {
        'Community Statistical Areas': 'csas-config',
        'Neighborhoods': 'neighborhoods-config',
        'Watersheds': 'watersheds-config',
        'Vital Signs': 'vitalsigns-config'
    };

    var select_id = swap[selection];

    d3.selectAll('.layer-panel')
        .style('display',function(){
            var id = d3.select(this).attr('id');
            if(id == select_id){
                return 'block';
            }
            else{
                self.clearConfigPanelOptions('#' + id);
                return 'none';
            }
        });

    $(document).trigger('mapUpdateEvent',[]);
};

DomManipulator.prototype.switchSite = function(selection,checked){
    var self = this;

    var swap = {
        'Community Managed Open Spaces' : 'cmos-config',
        'Stormwater Management': 'stormwater-config'
    };

    var select_id = swap[selection];

    d3.selectAll('.site-panel')
        .style('display',function(){
            var id = d3.select(this).attr('id');
            if(id == select_id){
                return 'block';
            }
            else{
                self.clearConfigPanelOptions('#' + id);
                return 'none';
            }
        });

    $(document).trigger('mapUpdateEvent',[]);
};

DomManipulator.prototype.activatePanelClosing = function(){
    var self = this;
    var options = {
        'Community Managed Open Spaces': '#site-select .radio label:contains("Community Managed Open Spaces") input',
        'Stormwater Management': '#site-select .radio label:contains("Stormwater Management") input',
        'Community Statistical Areas': '#layer-select .radio label:contains("Community Statistical Areas") input',
        'Neighborhoods': '#layer-select .radio label:contains("Neighborhoods") input',
        'Watersheds': '#layer-select .radio label:contains("Watersheds") input',
        'Vital Signs': '#layer-select .radio label:contains("Vital Signs") input',
    };
    $('.config-panel .panel-title .close').on('click',function(){
        $(this).closest('.config-panel').css('display','none');
        var panel_id = $(this).closest('.config-panel').attr('id');
        self.clearConfigPanelOptions('#' + panel_id);
        var selection = _.trimRight($(this)[0].parentNode.textContent,'×');
        var opt = $(options[selection]);
        opt.prop('checked',false);
        $(document).trigger('mapUpdateEvent',[]);
    });
};

DomManipulator.prototype.clearConfigPanelOptions = function(id){
    $(id).find('input').prop('checked',false);
}

DomManipulator.prototype.googleGeocode = function() {
    var self = this;
    return function (g, sync, async) {
        self.geocoder.geocode({
            address: g
        }, function (results) {
            var addresses = _.pluck(results, 'formatted_address');
            async(addresses);
        });
    }
};

DomManipulator.prototype.substringMatcher = function(strs) {
    return function findMatches(q, cb) {
        var matches, substringRegex;

        // an array that will be populated with substring matches
        matches = [];

        // regex used to determine if a string contains the substring `q`
        substrRegex = new RegExp(q, 'i');

        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
            if (substrRegex.test(str)) {
                matches.push(str);
            }
        });

        cb(matches);
    };
};

DomManipulator.prototype.appendConfigOptions = function(panel_id,options_id,selector_class,title,data){
    data = stable(data);
    var panel = d3.select(panel_id);
    var div = panel.select('.panel-collapse .panel-body')
        .append('div')
        .attr('id',options_id)
        .attr('class','config-options options');
    div.append('h4')
        .text(title);

    var select_all = div.append('div')
        .attr('class','config-select-all')
        .append('div')
        .attr('class','checkbox')
        .append('label')
        .attr('class','config-options-entry options-entry');

    var select_all_check = select_all.append('input')
        .attr('type','checkbox');
    select_all.append('p').append('i')
        .text('Select All/ None');

    var options = div.append('div')
        .attr('class','config-selector selector' + ' ' + selector_class);

    var labels = options.selectAll('div')
        .data(data)
        .enter()
        .append('div')
        .attr('class','checkbox')
        .append('label')
        .attr('class','config-options-entry options-entry');

    labels.append('input')
        .attr('type','checkbox')
    labels.append('p')
        .text(function(d){return d;})

    select_all_check.on('click',function(){
        var checked = select_all_check.property('checked');
        labels.selectAll('.checkbox label input')
            .property('checked',function(d){
                if(d!='null'){
                    if(checked == true){
                        return true;
                    }
                    if(checked == false){
                        return false;
                    }
                }
                if(d == 'null'){
                    return false;
                }
            });
    });
};

DomManipulator.prototype.getActiveLayers = function(){
    var names = [];
    var selected = $('#layer-select li input:checked');
    _.forEach(selected,function(s){
        names.push(s.parentNode.textContent);
    });
    return names;
};

DomManipulator.prototype.getActiveSites = function(){
    var names = [];
    var selected = $('#site-select li input:checked');
    _.forEach(selected,function(s){
        names.push(s.parentNode.textContent);
    });
    return names;
};

DomManipulator.prototype.getSelectedConfigOptions = function(options_id){
    var names= [];
    var selected = $(options_id + ' .config-selector .checkbox label input:checked');
    _.forEach(selected,function(s){
        names.push(s.parentNode.textContent);
    });
    return(names);
};

DomManipulator.prototype.constructFilter = function(){
    var self = this;
    var filter = new self.access.FilterQuery();
    var layers = self.getActiveLayers();
    var sitetypes = self.getActiveSites();
    var site_config_options = [];
    var layer_config_options = [];
    if(_.includes(sitetypes, 'Community Managed Open Spaces')){
        var vals = self.getSelectedConfigOptions('#cmos-config-uses');
        filter.addGpbFilter('cmos','uses',vals);
    }
    if(_.includes(sitetypes, 'Stormwater Management')){
        var vals = self.getSelectedConfigOptions('#stormwater-config-bmps');
        filter.addGpbFilter('stormwater','bmps',vals);
        var vals = self.getSelectedConfigOptions('#stormwater-config-statuses')
        filter.addGpbFilter('stormwater','statuses',vals);
    }
    if(_.includes(layers, 'Community Statistical Areas')){
        var vals = self.getSelectedConfigOptions('#csas-config-titles');
        filter.addGeoFilter('csas','titles',vals);
    }
    if(_.includes(layers, 'Watersheds')){
        var vals = self.getSelectedConfigOptions('#watersheds-config-titles');
        filter.addGeoFilter('watersheds','titles',vals);
    }
    if(_.includes(layers, 'Neighborhoods')){
        var vals = self.getSelectedConfigOptions('#neighborhoods-config-titles');
        filter.addGeoFilter('neighborhoods','titles',vals);
    }
    $(document).trigger('filterEvent',filter);
    return filter;
};

DomManipulator.prototype.updateSites = function(){
    var deferred = Q.defer();
    var self = this;
    var filter = self.constructFilter();
    var site_keys = self.access.filterSites(filter.query);
    self.access.findSites(site_keys).then(function(sites){
        self.map.updateSites(sites);
        deferred.resolve(sites);
    });
    return deferred.promise;
};

DomManipulator.prototype.updateLayers = function(){
    var deferred = Q.defer();
    var self = this;
    var filter = self.constructFilter();
    var layers = self.access.filterLayers(filter.query);
    if(layers == false){
        d3.select('#map').select('svg').selectAll('g').remove();
        deferred.resolve([]);
    }
    else{
        self.access.findLayers(layers.layer,layers.obj_keys).then(function(geo){
            self.map.updateGeo(geo);
            deferred.resolve(geo);
        });
    }
    return deferred.promise;
};

