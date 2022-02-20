var _			= require('underscore');
var pstack		= require('pstack');
var validator	= require('validator');
var fstool		= require('fs-tool');


Users = function(core, params, req, res) {
	var lib = {};
	lib = {
		// Returns the list of available brands
		available_balance: function(callback) {
			
			if (!params.email || !validator.isEmail(params.email)) {
				callback(core.errorResponse('Invalid user email', {code: 'invalid_email'}));
				return false;
			}
			
			if (!params.currency_code) {
				callback(core.errorResponse('Invalid currency code', {code: 'invalid_currency_code'}));
				return false;
			}
			
			core.db().select().from('mock_partner_users').where('email', params.email.toLowerCase()).where('currency_code', params.currency_code.toUpperCase()).then(function(response) {
				console.log("get user info knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				if (response && response.length==0) {
					// No user, create one
					var userData	= {
						email:				params.email.toLowerCase(),
						currency_code:		params.currency_code.toUpperCase(),
						balance_in_cents:	_.random(15, 500)*100,
						id: 0,
						
					};
					
					core.db().returning('*').insert(userData).into('mock_partner_users').then(function(response) {
						console.log("insert user info knex response:", response);
						userData.id = response[0]
						callback(userData);
					});
				} else {
					callback({
						email:				params.email.toLowerCase(),
						balance_in_cents:	response[0].balance_in_cents,
						currency_code:		response[0].currency_code,
						id: 				response[0].id
					});
				}
				
			});
		},
		
		// If our design called for having multiple carts per user our database schema would handle it
		// Returns user's cart
		available_cart:function(callback) {
			
			if (!params.user_id || !validator.isInt(params.user_id)) {
				callback(core.errorResponse('Invalid User ID', {code: 'invalid_user_id'}));
				return false;
			}
			
			core.db().select().from('mock_partner_carts').where('user_id', params.user_id).then(function(response) {
				console.log("get cart knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				if (response && response.length==0) {
					// No cart, create one
					core.db().returning('*').insert({user_id: params.user_id}).into('mock_partner_carts').then(function(response) {
						console.log("insert cart knex response:", response);
						
						var cart_data = {
            			  cart_id: response[0],
            			  cart_items: [],
            			  cart_total_in_cents: 0,
            			};
						callback(cart_data);
					});
				} 
				else {
					var cart_data = {
         		    cart_id: response[0].id,
         		    cart_items: [],
         		    cart_total_in_cents: 0,
         			};
					
					core.db().select().from("mock_partner_cart_items").where('cart_id', response[0].id).then(function(response) {
                        console.log("get cart items knex response:", response);
                        
						if (!response) {
                            callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
                            return false;
                        }
						
						cart_data.cart_items = response;
					});
						
						// Calculate cart total (sum of all cart items value)
						core.db().select().from("mock_partner_cart_items").sum("value").where('cart_id', response[0].id).then(function(response) {
							console.log("sum of cart items value knex response:", response);
						
							if (!response) {
								callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
								return false;
							}
							
							cart_data.cart_total_in_cents = response[0]['sum(`value`)']
							
							callback(cart_data);
							});
						}
					});
				},
		
		// Return's user purchase history
		available_purchase_history:function(callback) {
			
			if (!params.user_id || !validator.isInt(params.user_id)) {
				callback(core.errorResponse('Invalid User ID', {code: 'invalid_user_id'}));
				return false;
			}
			
			core.db().select(["mock_partner_purchases.id"]).from('mock_partner_purchases').where('user_id', params.user_id).then(function(response) {
				console.log("get purchase knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				if (response && response.length==0) {
					console.log("No purchase history found")
					callback(response);
					} 
				else {
					var user_purchase_ids = response.map((item) => {
            			return item.id;
         		    });
					
					core.db().select().from("mock_partner_purchase_items").whereIn('purchase_id', user_purchase_ids).then(function(response) {
						console.log("get purchase items knex response:", response);
                        
						if (!response) {
                            callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
                            return false;
                        }
						
						//Organize purchase items response by purchase ID
						let purchase_history_items = [];
            			let purchase_history_keys = new Set();
            			response.forEach((item) => {
            			  	if (purchase_history_keys.has(item.purchase_id)) {
								purchase_history_items[item.purchase_id].items.push(item);
            				} 
							else {
								purchase_history_keys.add(item.purchase_id);
								purchase_history_items[item.purchase_id] = {
            			    	date: "",
            			    	items: [item],
            			    	};
								purchase_history_items[item.purchase_id].date = item.date;
            				}
            			});
						
						callback(purchase_history_items);
                        })
					}
				});
			},
		};
	return lib;
}

module.exports = Users;