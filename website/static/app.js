(function() {
	
	window.api_server	= 'http://localhost:8850';
	
	// Create the angular app
	window.app = angular.module('app', [])

	var core = function() {
		this.page	= 'index';	// Current page to display (monitored by Angular)
	};
	// AJAX Call
	core.prototype.apicall	= function(options) {
		var scope = this;

		options	= _.extend({
		}, options);

		var ajaxObj = {
			url: 		options.url,
			dataType: 	'json',
			type:		options.type||"POST",
			data:		options.params,
			headers:	options.headers,
			success: 	function(response, status){
				if (typeof response=='string') {
					try {
						response = JSON.parse(response);
					} catch (e) {}
				}
				options.callback(response, status);
			},
			error: function(jqXHR, data, errorThrown) {
				options.onError({
					error:		true,
					message:	errorThrown
				});
			}
		};


		if (options.json) {
			ajaxObj.data = JSON.stringify(ajaxObj.data);
		}

		if (options.crossDomain) {
			ajaxObj.crossDomain	= true;
			ajaxObj.contentType = "application/json";
		}

		$.ajax(ajaxObj);
	};
	// Get the query string as a js object
	core.prototype.qs = function() {
		var urlParams;
		var match,
		pl     = /\+/g,  // Regex for replacing addition symbol with a space
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query  = window.location.search.substring(1);

		urlParams = {};
		while (match = search.exec(query))
		urlParams[decode(match[1])] = decode(match[2]);
		return urlParams;
	};
	// UUID-V4 generator
	core.prototype.uuidv4	= function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	};
	
	window.core = new core();
	console.log("window.core",new core());
	
})(window)