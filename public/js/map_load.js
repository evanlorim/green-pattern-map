var access = angular.module('data',['ngRoute','ui.bootstrap']);

access.service('retrieveData', function($http){
	this.getAccessData = function(){
		return $http.get('/api/access_data');
	};
	this.getAccessSelectors = function(){
		return $http.get('/api/access_selectors');
	};
	this.findSites = function(site_doc_ids,radiusfilter){
		return $http.post('/api/findsites',{'site_doc_ids':site_doc_ids,radiusfilter:radiusfilter});
	};
	this.findGeo = function(collection,geo_doc_ids){
		return $http.post('/api/findgeo',{'collection':collection,'geo_doc_ids':geo_doc_ids});
	};
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
		$scope.adaptLegend();
		$scope.applyActiveSelectors();
	};

	$scope.applyActiveSelectors = function(){
		var deferred = $q.defer();
		$scope.applyLayerSelectors().then(function(result){
			return $scope.applyPatternSelectors();
		},function(error){
			return $scope.applyPatternSelectors();
		}).then(function(result){
			deferred.resolve(true);
		},function(error){
			deferred.resolve(false);
		});
		return deferred.promise;
	};

	$scope.applyLayerSelectors = function(){
		var deferred = $q.defer();
		if($scope.active.layer === null){
			$scope.updateMapLayer();
			deferred.resolve(true);
		}
		else{
			if($scope.active.layer.id == 'watersheds'){var collection = 'watersheds'}
			if($scope.active.layer.id == 'neighborhoods'){var collection = 'neighborhoods'}
			if($scope.active.layer.id == 'csas'){var collection = 'csas'}
			if($scope.active.layer.set == 'vs_geo'){var collection = 'vs_csas'}
			var geo_doc_ids = $scope.active.layer.getFilteredGeoDocIds();
			retrieveData.findGeo(collection,geo_doc_ids).then(function(data){
				var geo = data.data.data;
				$scope.updateMapLayer(geo);
				deferred.resolve(true);
			});
		}
		return deferred.promise;
	};

	$scope.applyPatternSelectors = function(){
		var deferred = $q.defer();
		if($scope.active.pattern === null){
			$scope.updateMapMarkers([]);
			deferred.resolve(true);
		}
		else{
			var site_doc_ids = $scope.active.pattern.getFilteredSiteDocIds();
			retrieveData.findSites(site_doc_ids,$scope.active.radius_filter).then(function(data){
				var points = data.data.data;
				$scope.updateMapMarkers(points);
				deferred.resolve(data);
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
			var color;
			var fillColor;
			var pop = '';
			if(p.set == 'cmos'){
				color = '#33a02c';
				fillColor = '#b2df8a';
				pop = '';
				if(p.name){
					pop = pop + '<h4>' + p.name  + '</h4><br>';
					//console.log(pop);
				}
				else{
					pop = pop + '<h4> Unnamed </h4><br>';
				}
				pop = pop + "<img src=\'/public/img/img_placeholder_white.png\' width=\'120px\' height=\'auto\'></img>";
				pop = pop + '<p><b>Location: </b>';
				if(p.address){
					pop = pop + p.address;
				}
				else{
					pop = pop + 'Unknown';
				}
				pop = pop + '</p>';
				pop = pop + '<p><b>Site Uses: </b>';
				if(p.uses){
					pop = pop + p.uses.join(", ");
				}
				else{
					pop = pop + 'None';
				}
				pop = pop + '</p>'
			}

			if(p.set == 'stormwater'){
				if(p.status == 'Active'){
					fillColor = '#a6cee3';
					color = '#1f78b4';
				}
				else if (p.status == 'Identified'){
					fillColor = '#fb9a99';
					color = '#e31a1c';
				}
				pop = pop + '<p><b>Location: </b>( ' +  p.coordinates[0].toFixed(2) + ", " + p.coordinates[1].toFixed(2) + " )</p>";
				pop = pop + '<p><b>Status: </b>';
				if(p.status){
					pop = pop + p.status;
				}
				else{
					pop = pop + "None";
				}
				pop = pop + "</p>";
				pop = pop + "<p><b>Best Management Practices: </b>"
				if(p.bmps){
					pop = pop + p.bmps.join(", ");
				}
				else{
					pop = pop + "None";
				}
				pop = pop + "</p>";
				pop = pop + "<p><b>Source: </b>";
				if(p.source){
					pop = pop + p.source;
				}
				else{
					pop = pop + "Not Provided";
				}
				pop = pop + "</p>";
			}

			var m = new L.circleMarker([p.coordinates[1],p.coordinates[0]],{'fillOpacity':.6,'radius':6,'opacity':1,'fillColor':fillColor,'color':color});
			m.bindPopup(pop);
			return m;
		});
		if($scope.active.radius_filter){
			$scope.circ = new L.circle($scope.active.radius_filter.coordinates, $scope.active.radius_filter.radius);
			$scope.markers.addLayer($scope.circ);
		}
		$scope.markers.addLayer(new L.layerGroup(markers));
		$scope.markers.addTo($scope.map);
	}

	$scope.updateMapLayer = function(geo){
    		if($scope.svg){
    			$scope.svg.selectAll('.geo_path').remove();
    		}
    		if(!geo || geo.features.length == 0){return false;}
    		var bounds = d3.geo.bounds(geo);
		    var bl_bound = bounds[0];
    		var tr_bound = bounds[1];
    		var p1 = project(bounds[0]);
    		$scope.svg = d3.select('#map').select('svg')
    			.attr('id','map-svg')
    			.style('opacity',1);

			var path_group = $scope.svg.append('g')
				.attr('class','geo_path');

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
	        bounds: {'northeast':{'lat':39.383611, 'lng':-76.458333}, 'southwest':{'lat':39.244444, 'lng': -76.693889}},
	        sensor: false,
	      }
	    }).then(function(response){
	      return response.data.results.map(function(item){
	      	console.log(item);
	        return item;
	      });
	    });
  	};

	function initialize(){
		$scope.defaults = {
			'fallback_layer_color':'#48C9B0',
			'layer_opacity':.6,
			'search_radius':1000,
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
		$scope.active = {layer:null,pattern:null,radius_filter:null};
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
				address:{active:false,title:'Addresses'},
				indicators:{active:false,title:'Indicators'}
			};

			$scope.active.search = null;
			$scope.active.search_selection = null;

			initializeMap();
		});
	}

	$scope.switchSearch = function(search){
		$scope.active.search = search;
		_.forIn($scope.searches,function(s){
			if(s.title != search.title){
				s.active = false;
			}
			if(s.title == search.title){
				s.active = true;
			}
		});
		$scope.active.search_selection = null;
		$scope.clearRadiusFilter();
	}

	$scope.searchSelect = function(selection){
		$scope.active.search_selection = selection;
	}

	$scope.submitSearch = function(){
		if($scope.active.search.title == 'Indicators'){
			if($scope.active.search_selection){
				$scope.switchSelector($scope.active.search_selection,true);
			}
		}
		else if($scope.active.search.title == 'Addresses'){
			if($scope.active.search_selection){
				var sel = $scope.active.search_selection;
				$scope.active.radius_filter = {title:sel.formatted_address,coordinates:[sel.geometry.location.lat,sel.geometry.location.lng],radius:$scope.user_settings.search_radius};
				$scope.applyActiveSelectors();
			}
		}
	}

	$scope.clearRadiusFilter = function(){
		$scope.active.radius_filter = null;
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

        $scope.markers = new L.LayerGroup({
    	});

    	var zoom = new L.Control.Zoom({ position: 'topright' });
    	zoom.addTo($scope.map);

    	$scope.circ = new L.circle();
    	$scope.circ.addTo($scope.map);
	}

	createClusterIcon = function (cluster,d) {
		var cmos_base = '#b2df8a';
	    var children = cluster.getAllChildMarkers();
	    var childCount = cluster.getChildCount();
        var d = children[0].options.data;
	    if(d.set == 'cmos'){
	    	if(childCount == 1){
		    	return new L.divIcon({
	    		className:'cmos-marker',
	    		iconSize: new L.Point(20,20)
	    		});
	    	}
	    	else if(childCount <10){
	    		return new L.divIcon({
	    			html:'<div><span>' +childCount +"</span></div>",
	    			className:'cmos-marker-small marker-cluster',
	    			iconSize: new L.point(25,25)
	    		})

	    	}
	    	else if (childCount < 100) {
	    		return new L.divIcon({
	    			html:'<div><span>' +childCount +"</span></div>",
	    			className:'cmos-marker-med marker-cluster',
	    			iconSize: new L.point(30,30)
	    		})
	    	}
	    }
	};

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
		this.open = false;
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
	};


	Selector.prototype.activate = function(){
		this.active = true;
		this.open = true;
	};

	Selector.prototype.deactivate = function(){
		var self = this;
		self.active = false;
		_.forIn(self.filters,function(filter){
			filter.selectNone();
		});
		this.open = false;
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
			return(results);
		}
	};

	Selector.prototype.getFilterById = function(id){
		var self = this;
		var answer = null; 
		_.forIn(self.filters,function(f){
			if(f.id == id){
				answer = f;
			}
		});
		return answer;
	};

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
		this.active = !this.active;
	};
	ConfigOption.prototype.toggleAndUpdate = function(){
		var self = this;
		$scope.applyActiveSelectors().then(function(res){
		})
	}
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





