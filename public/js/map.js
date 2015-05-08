var Map = function(){
    var self = this;
    //initialize map

};

Map.prototype.initialize = function(){
    var self = this;

    self.options = {'differentiate_markers':false};

    self.map = L.map('map',{
        'center': [39.2854197594374, -76.61796569824219],
        'zoom' : 12,
        'zoomControl' : false
    });

    self.tile = L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 20,
        attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    self.zoom = new L.Control.Zoom({ position: 'topright' });

    self.tile.addTo(self.map);
    self.zoom.addTo(self.map);

    self.markers = new L.MarkerClusterGroup({
            showCoverageOnHover:false,
            zoomToBoundsOnClick:false,
            animateAddingMarkers:true,
            maxClusterRadius:30,
            disableClusteringAtZoom:18,
            singleMarkerMode:true,
            iconCreateFunction: self.createClusterIcon
    });

    self.map._initPathRoot();
    self.svg;
    self.colors = new self.Colors();
    self.marker_types = [];
};

Map.prototype.updateSites = function(sites){
    var self = this;
    self.markers.clearLayers();
    if(sites.length == 0){
        return;
    }
    var arr = [];
    _.forIn(sites,function(site){
        var marker = new L.marker([site.coordinates[1],site.coordinates[0]],{data:site});
        arr.push(marker);
    });
    self.markers.addLayer(new L.layerGroup(arr));
    self.markers.addTo(self.map);
};

Map.prototype.updateGeo = function(geo){
    var self = this;
    if(self.svg){
        self.svg.selectAll('g').remove();
    }
    var bounds = d3.geo.bounds(geo);
    var bl_bound = bounds[0];
    var tr_bound = bounds[1];
    var p1 = project(bounds[0]);
    self.svg = d3.select('#map').select('svg')
        .attr('id','map-svg')
        .style("opacity",1);

    var path_group = self.svg.append('g');

    var paths = path_group.selectAll('path')
        .data(geo.features)
        .enter()
        .append('path')
        .style('stroke','white')
        .style('fill','rgba(244, 172, 183,.6)');


    var path_tt = paths.append('svg:title')
        .text(function(geo){
            return "placeholder";
        });

    resize();
    self.map.on('viewreset',resize);
    function resize(){
        //var bl_proj = project(bl_bound);
        //var tr_proj = project(tr_bound);
        //var new_width = tr_proj[0] - bl_proj[0] + 'px';
        //var new_height = bl_proj[1] - tr_proj[1] + 'px';
        //var new_top = tr_proj[1] + 'px';
        //var new_left = bl_proj[0] + 'px';
        paths.attr('d', d3.geo.path().projection(project));
    }
    function project(x){
        var point = self.map.latLngToLayerPoint(new L.LatLng(x[1],x[0]));

        return [point.x,point.y];
    }



/*    paths.on('mouseout',function(d){
        d3.select(this).style('fill',function(d){
            return('rgba(244, 172, 183,.6)')
        });
    });
    paths.on('mouseover',function(d){
        d3.select(this).style('fill',function(d){
                return('rgba(244, 66, 92,.6)');

        });
    });*/
};

Map.prototype.createClusterIcon = function (cluster,d) {
    var children = cluster.getAllChildMarkers();
    var childCount = cluster.getChildCount();
    var c = ' marker-cluster-';
    var opts = ['inner inner1','inner inner2','inner inner3','inner inner4'];
    if(childCount == 1){
        var d = children[0].options.data;
        console.log(d);
        if(d.set == 'cmos'){
            return new L.DivIcon({ html: '<div><div class=\'' + opts[getRandomInt(0,4)] + '\'>' + childCount + '</div></div>', className: 'marker-cluster cmos-marker', iconSize: new L.Point(20, 20) })
        }
        else if(d.set == 'stormwater'){
            c = ' stormwater-marker'
        }
    }
    else if (childCount < 10) {
        c += 'small';
    } else if (childCount < 100) {
        c += 'medium';
    } else {
        c += 'large';
    }

    return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(20, 20) });
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

Map.prototype.Colors = function(){
    this.light_colors = ['#a6cee3','#b2df8a','#fb9a99','#fdbf6f','#cab2d6','#ffff99'];
    this.dark_colors = ['#1f78b4','#33a02c','#e31a1c','#ff7f00','#6a3d9a','#b15928'];
    this.color_combos = [];
    _.forIn(this.dark_colors,function(dc){
        _.forIn(this.light_colors,function(lc){
            color_combos.push([dc,lc]);
        })
    });
    this.color_combos = _.shuffle(this.color_combos);
};

