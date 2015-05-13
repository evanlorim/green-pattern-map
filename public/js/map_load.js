var access = angular.module('data',['ngRoute','ui.bootstrap']);

access.service('retrieveData', function($http){
	this.getAccessData = function(){
		return $http.get('/api/access_data');
	};
	this.getAccessSelectors = function(){
		return $http.get('/api/access_selectors');
	};
	this.findSites = function(site_doc_ids){
		return $http.post('/api/findsites',{'site_doc_ids':site_doc_ids});
	}
	this.findGeo = function(collection,geo_doc_ids){
		return $http.post('/api/findgeo',{'collection':collection,'geo_doc_ids':geo_doc_ids});
	}
});

access.controller('dataController', function ($scope,$http, $q,retrieveData, $modal){
	initialize();

	$scope.openVsModal = function(section){
		var modalInstance = $modal.open({
			templateUrl:'/public/templates/vs_modal.html',
			controller:'vsModalController',
			resolve: {
				section: function(){
					return section;
				}
			},
			scope: $scope
		});
		modalInstance.result.then(function(selectedItem){
			$scope.switchSelector(selectedItem,true);
		}, function(){
			//dismiss
		});
	};

	$scope.switchSelector = function(selector,on){
		if(selector.type == 'sites'){
			if(on){
				$scope.active.pattern = selector;
			}
			else{
				$scope.active.pattern = null;
			}
		}
		else if(selector.type == 'geo'){
			if(on){
				$scope.active.layer = selector;
			}
			else{
				$scope.active.layer = null;
			}
		}
		if(on){
			selector.activate();
			_.forIn($scope.selectors,function(s){
				if(s.type == selector.type && s.id != selector.id){
					s.deactivate();
				}
			});
		}
		else{
			selector.deactivate();
		}
		$scope.applyActiveSelectors();
	};

	$scope.exchangeSiteDocIds = function(site_doc_ids){
		var deferred = $q.defer();
		retrieveData.findSites().then(function(site_docs){
			console.log(site_docs);
		})
	}

	$scope.applyActiveSelectors = function(){
		var deferred = $q.defer();
		if($scope.active.pattern === null){
			$scope.updateMapMarkers([]);
		}
		else{
			var site_doc_ids = $scope.active.pattern.getFilteredSiteDocIds();
			retrieveData.findSites(site_doc_ids).then(function(data){
				var points = data.data.data;
				$scope.updateMapMarkers(points);
				deferred.resolve(data);
			})
		}
		if($scope.active.layer === null){
			$scope.updateMapLayer();
		}
		else{
			if($scope.active.layer.id == 'watersheds'){var collection = 'watersheds'}
			if($scope.active.layer.id == 'neighborhoods'){var collection = 'neighborhoods'}
			if($scope.active.layer.id == 'csas'){var collection = 'csas'}
			if($scope.active.layer.set == 'vs_geo'){var collection = 'vs_csas'}
			var geo_doc_ids = $scope.active.layer.getFilteredGeoDocIds();
			retrieveData.findGeo(collection,geo_doc_ids).then(function(data){
				var geo = data.data.data;
				console.log(geo);
				$scope.updateMapLayer(geo);
			})
		}
		return deferred.promise;
	};

	$scope.updateMapMarkers = function(points){
		$scope.markers.clearLayers();
		if(!points || points.length == 0){
			return;
		}
		var markers = _.map(points,function(p){
			var m = new L.marker([p.coordinates[1],p.coordinates[0]],{data:p});
			return m;
		})
		$scope.markers.addLayer(new L.layerGroup(markers));
		$scope.markers.addTo($scope.map);
	}

	$scope.updateMapLayer = function(geo){
    		if($scope.svg){
    			$scope.svg.selectAll('g').remove();
    		}
    		if(!geo){return;}
    		var bounds = d3.geo.bounds(geo);
		    var bl_bound = bounds[0];
    		var tr_bound = bounds[1];
    		var p1 = project(bounds[0]);
    		$scope.svg = d3.select('#map').select('svg')
    			.attr('id','map-svg')
    			.style('opacity',1);

			var path_group = $scope.svg.append('g');

			var paths = path_group.selectAll('path')
				.data(geo.features)
				.enter()
				.append('path')
				.style('stroke','#FFFFFF')
				.style('stroke-width',3)
		        .style('fill',function(d){
		        	if(d.properties.color){
		        		return chroma(d.properties.color).alpha($scope.user_settings.layer_opacity).css();
		        	}
		        	else{
		        		return chroma($scope.defaults.fallback_layer_color).alpha($scope.user_settings.layer_opacity).css();
		        	}
		        });

	        var path_tt = paths.append('svg:title')
	        	.text(function(d){
	        		var tt = d.properties.id;
	        		if(d.properties.value){
	        			tt = tt + "(" + d.properties.value + ")";
	        		}
	        		return tt;
	        	});
        	resize();
        	$scope.map.on('viewreset',resize);
        	function resize(){
        		paths.attr('d',d3.geo.path().projection(project));
        	}
    		function project(x){
    			var point = $scope.map.latLngToLayerPoint(new L.LatLng(x[1],x[0]));
        		return [point.x,point.y];
    		}
    	}

    $scope.getLocation = function(val) {
	    return $http.get('http://maps.googleapis.com/maps/api/geocode/json', {
	      params: {
	        address: val,
	        sensor: false
	      }
	    }).then(function(response){
	      return response.data.results.map(function(item){
	        return item.formatted_address;
	      });
	    });
  	};

	function initialize(){
		$scope.defaults = {
			'fallback_layer_color':'#48C9B0',
			'layer_opacity':.6,
			'search_radius':1,
			'filter_by_layer':false,
			'cluser_markers':true
		};
		$scope.user_settings = {
			'layer_opacity':$scope.defaults.layer_opacity,
			'search_radius':$scope.defaults.search_radius,
			'filter_by_layer':$scope.defaults.filter_by_layer,
			'cluster_markers':$scope.defaults.cluser_markers
		};
		$scope.selectors = {};
		$scope.active = {layer:null,pattern:null};
		retrieveData.getAccessData().then(function(data){
			var alldata = data.data.data;
			$scope.selectors = _.map(alldata,function(obj){
				var s = new Selector(obj);
				if(s.type == 'sites'){
					if(s.id == 'cmos'){
						s.img_src = '/public/img/cmos_white.png';
					}
					if(s.id == 'stormwater'){
						s.img_src = '/public/img/stormwater_white.png';
					}
				}
				return s;
			});
			var sections = [];
			$scope.site_selectors = [];
			$scope.standard_layer_selectors = [];
			$scope.vs_layer_selectors = [];
			$scope.layer_selectors = [];
			_.forIn($scope.selectors, function(sel){
				if(sel.type == 'sites'){
					$scope.site_selectors.push(sel);
				}
				else if(sel.type == 'geo'){
					$scope.layer_selectors.push(sel);
					if(sel.set == 'standard_geo'){
						$scope.standard_layer_selectors.push(sel);
					}
					else if(sel.set == 'vs_geo'){
						$scope.vs_layer_selectors.push(sel);
						sections.push(sel.meta.section);
					}
				}
			});
			sections = _.unique(sections);
			$scope.vs_section_selectors = _.map(sections,function(sect){
				var obj = {};
				obj.title = sect;
				obj.selectors = [];
				_.forIn($scope.vs_layer_selectors,function(vsl){
					if(vsl.meta.section == sect){
						obj.selectors.push(vsl);
					}
				});
				return obj;
			});

			$scope.searches = {
				placeholder:{active:true},
				address:{active:false,title:'Addresses'},
				indicators:{active:false,title:'Indicators'}
			};

			initializeMap();
		});
	}

	$scope.switchSearch = function(search){
		_.forIn($scope.searches,function(s){
			if(s.title != search.title){
				s.active = false;
			}
			if(s.title == search.title){
				s.active = true;
			}
		});
	}

	function initializeMap(){
		$scope.map = L.map('map', {'center': [39.2854197594374, -76.61796569824219],
        'zoom' : 12,
        'zoomControl' : false});

        $scope.map._initPathRoot();
        $scope.svg;

        L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 20,
        attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    	}).addTo($scope.map);

        $scope.markers = new L.MarkerClusterGroup({
            showCoverageOnHover:false,
            zoomToBoundsOnClick:false,
            animateAddingMarkers:true,
            maxClusterRadius:30,
            disableClusteringAtZoom:18,
            singleMarkerMode:true,
            iconCreateFunction: createClusterIcon
    	});

    	var zoom = new L.Control.Zoom({ position: 'topright' });
    	zoom.addTo($scope.map);
	}

	createClusterIcon = function (cluster,d) {
	    var children = cluster.getAllChildMarkers();
	    var childCount = cluster.getChildCount();
	    var c = ' marker-cluster-';
	    if(childCount == 1){
	        var d = children[0].options.data;
	        console.log(d);
	        if(d.set == 'cmos'){
	            c = ' cmos-marker';
	        }
	        else if(d.set == 'stormwater'){
	            if(d.status == 'Identified'){c = ' sw-identified-marker';}
	            else{
	            	c= ' sw-active-marker';
	            }
	        }
            return new L.DivIcon({ html: '<div><span></span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(20, 20) });
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
});


access.controller('vsModalController', function ($scope, $modalInstance, section){
	$scope.section = section;
	$scope.items = section.selectors;

	$scope.ok = function (item) {
		$modalInstance.close(item);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
});


var Selector = function(obj){
		this.id = obj.id;
		this.title = obj.pretty_name;
		this.type = obj.type;
		if(obj.meta){
			this.meta = obj.meta;
			if(obj.meta.set){
				this.set = obj.meta.set;
			}
			else{
				this.set = null;
			}
		}
		else{
			obj.meta = {};
		}
		this.active = false;
		this.show_all = false;
		var self = this;
		self.filters = [];
		self.filter_titles = [];
		self.filter_ids = [];
		_.forIn(obj.filterable,function(filterable){
			var f = new Filter(self,filterable,obj.info[filterable.name]);
			self.filters.push(f);
			self.filter_titles.push(f.title);
			self.filter_ids.push(f.id);
		})
		if(obj.site_doc_ids){
			self.site_doc_ids = obj.site_doc_ids;
		}
		else{
			self.site_doc_ids = null;
		}
		if(obj.geo_doc_ids){
			self.geo_doc_ids = obj.geo_doc_ids;
		}
		else{
			self.geo_doc_ids = null;
		}
}
Selector.prototype.toggleShowAll = function(){
	this.show_all = !this.show_all;
}

Selector.prototype.activate = function(){
	this.active = true;
}

Selector.prototype.deactivate = function(){
	var self = this;
	self.active = false;
	_.forIn(self.filters,function(filter){
		filter.selectNone();
	});
}

Selector.prototype.getActiveFilters = function(){
	var self = this;
	return _.filter(self.filters,function(f){
		var act_opts = f.getActiveOptions();
		if(act_opts.length > 0){
			return true;
		}
		else{
			return false;
		}
	})
}

Selector.prototype.getFilteredSiteDocIds = function(){
	var self = this;
	if(!self.site_doc_ids){return null;}
	if(self.show_all){
		return self.site_doc_ids;
	}
	else{
		var active_filters = self.getActiveFilters();
		var results = [];
		_.forIn(active_filters, function(af){
			var ids = af.pluckActiveOptions('site_doc_ids',{'flatten':true,'unique':true});
			results.push(ids);
		});
		results = _.unique(_.flatten(results));
		return(results);
	}
}

Selector.prototype.getFilteredGeoDocIds = function(){
	var self = this;
	if(!self.type == 'geo'){return null;}
	if(self.show_all){
		return self.geo_doc_ids;
	}
	else{
		var active_filters = self.getActiveFilters();
		var results = [];
		_.forIn(active_filters, function(af){
			if(_.includes(af.exchange_with,'geo_doc_id')){
				var ids = af.pluckActiveOptions('geo_doc_id');
				results.push(ids);
			}
			else if(_.includes(af.exchange_with,'geo_doc_ids')){
				var ids = af.pluckActiveOptions('geo_doc_ids',{'flatten':true,'unique':true});
				results.push(ids);
			}
		});
		results = _.unique(_.flatten(results));
		console.log(results.length);
		return(results);
	}
}

var Filter = function(selector,filterable,info){
	this.selector = selector;
	this.id = filterable.name;
	this.title = filterable.pretty_name;
	this.exchange_with = filterable.exchange_with;
	this.options = [];
	this.option_titles = [];
	this.select_all_active = false;
	if(filterable.attributes){
		this.attributes = filterable.attributes;
	}
	else{
		this.attributes = [];
	}
	var self = this;
	_.forIn(info,function(i){
		var o = new ConfigOption(self,i);
		self.options.push(o);
		self.option_titles.push(o.title);
	});
}

Filter.prototype.pluckActiveOptions = function(property,pluck_options){
	var self = this;
	var act_opt = self.getActiveOptions();
	var results = _.map(act_opt,function(ao){
		return(ao[property]);
	});
	if(pluck_options){
		if(pluck_options.flatten){
			results = _.flatten(results);
		}
		if(pluck_options.unique){
			results = _.unique(results);
		}
	}
	return results;
}

Filter.prototype.pairActiveOptions = function(property1,property2){
	var self = this;
	var act_opt = self.getActiveOptions();
	var results = _.map(act_opt,function(ao){
		return([ao[property1],ao[property2]]);
	})
	return results;
}

Filter.prototype.getActiveOptions = function(){
	var self = this;
	var tmp =  _.filter(self.options,function(o){
		return(o.active);
	});
	return(tmp);
}

Filter.prototype.getOption = function(title){
	var self = this;
	_.forIn(self.options,function(o){
		if(o.title == title){
			return o;
		}
	})
	return null;
};

Filter.prototype.selectAll = function(){
	var self = this;
	_.forIn(self.options,function(o){
		if(o.title != 'null'){
			o.activate();
		}
	});
};

Filter.prototype.selectNone = function(){
	var self = this;
	_.forIn(self.options,function(o){
		o.deactivate();
	})
};

Filter.prototype.toggle = function(){
	var self = this;
	if(self.select_all_active == false){
		self.select_all_active = true;
		self.selectAll();
		return;
	}
	else{
		self.select_all_active = false;
		self.selectNone();
		return;
	}
};

var ConfigOption = function(filter,obj){
	var self = this;
	var keys = _.keys(obj);
	_.forIn(keys,function(k){
		self[k] = obj[k];
	})
	self.filter = filter;
	self.active = false;
};
ConfigOption.prototype.activate = function(){
	this.active = true;
};
ConfigOption.prototype.deactivate = function(){
	this.active = false;
};
ConfigOption.prototype.toggle = function(){
	return !this.active;
}


