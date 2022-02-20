var _			= require('underscore');
var path 		= require('path');
var fs			= require('fs');
const Knex		= require('knex');
var querystring	= require('querystring');
var request		= require('request');


var core = function(params, req, res, handler) {
	
	var lib 	= {};
	
	// Create a Knex instance
	lib.db = function() {
		return handler.db(lib.env);
	}
	
	// API calls to the outside
	lib.apicall	= function(method, endpoint, params, callback, headers) {
		var obj = {
			url:		endpoint,
			method: 	method,
			headers:	_.extend({}, headers)
		};
		if (obj.method=='GET') {
			obj.url+='?'+querystring.stringify(params)
		} else {
			obj.json	= params;
		}
		console.log("API", "obj", obj);
		request(obj, function(error, response, body) {
			callback(body, response);
		});
	};
	
	// Standard Error response
	lib.errorResponse	= function(error, data) {
		var output	= _.extend({}, data, {
			error:		true,
			message:	error
		});
		return output;
	}
	
	// UUID-V4 generator
	lib.uuidv4	= function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	};
	
	// Add logic here
	lib.giftcards	= require('./giftcards')(lib, params, req, res);
	lib.users		= require('./users')(lib, params, req, res);
	lib.cart 		= require('./cart')(lib, params, req, res);
	
	return lib;
}


module.exports = core;