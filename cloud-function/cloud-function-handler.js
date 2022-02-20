var pstack		= require('pstack');
var _ 			= require('underscore');
var Knex		= require('knex');
var querystring	= require('querystring');

var cloudFunctionHandler = function(options) {
	this.options			= options;
	this.sql_connections	= null;
	this.routes				= {};
}

// DB connection
cloudFunctionHandler.prototype.db = function() {
	if (this.sql_connections) {
		return this.sql_connections;
	}
	
	// Edit this
	
	
	this.sql_connections = Knex({
		client:		'mysql',
		connection:	config,
		pool:		{
			min: 0,
			max: 10
		},
		acquireConnectionTimeout: 10000
	});

	return this.sql_connections;
}

// Register a new route
cloudFunctionHandler.prototype.on = function(route, callback, options) {
	this.routes[route] = {
		callback:	callback,
		options:	options
	}
	return this.routes[route];
}

// Start & serve
cloudFunctionHandler.prototype.start = function(req, res) {
	var scope = this;
	// Allow all origins
	res.set('Access-Control-Allow-Origin', '*');
	
	// Extract the data we need
	var headers = req.headers;
	var params	= _.extend({}, req.query, req.body);
	
	var coreClass = this.options.core;
	var core = coreClass(params, req, res, this);
	
	// Find which route matches that server
	// Path splitting
	var pathVars = req.path.split('/');
	
	if (this.routes[req.path]) {
		// Route found
		var route = this.routes[req.path];
		
		// Optionnal CORS support
		if (route.options.CORS) {
			if (req.method === 'OPTIONS') {
				// Send response to OPTIONS requests
				res.set('Access-Control-Allow-Methods', 'POST');
				res.set('Access-Control-Allow-Headers', 'Content-Type');	// Add any header your client-side sends here, otherwise CORS won't work
				res.set('Access-Control-Max-Age', '3600');
				res.status(204).send('');
				return false;
			}
		} else {
			if (req.method === 'OPTIONS') {
				return res.status(405).send({error:"OPTION not supported on this endpoint"}).end();
			}
		}
		
		var stack	= new pstack();
		var buffer	= {};
		
		// @TODO: Auth support
		stack.add(function(done) {
			done();
		});
		
		// Decryption
		stack.add(function(done) {
			params = scope.decryptParameters(params, headers);
			done();
		});
		
		// Endpoint logic
		// Execute the callback associated with that route
		stack.add(function(done) {
			route.callback(params, function(response, response_code) {
				buffer.response			= response;
				buffer.response_code	= response_code;
				done();
			}, req, res, core)
		});
		
		// Encryption of the response
		stack.add(function(done) {
			if (route.options.encrypt) {
				buffer.response = scope.encryptResponse(buffer.response, headers);
			}
			done();
		});
		
		// Respond
		stack.start(function() {
			res.status(buffer.response_code||200).send(JSON.stringify(buffer.response, null, 4)).end();
		});
		
	} else {
		// Route not found
		return res.status(404).send({error:"Endpoint not found."}).end();
	}
}

// @TODO: Decrypt the input parameters
cloudFunctionHandler.prototype.decryptParameters = function(params, headers) {
	// Input: Encrypted parameters
	// Output: Decrypted parameters (object)
	return params;
}

// @TODO: Encrypt the response
cloudFunctionHandler.prototype.encryptResponse = function(response, headers) {
	// Input: JSON response
	// Output: Encrypted response
	return response;
}

module.exports = cloudFunctionHandler;
