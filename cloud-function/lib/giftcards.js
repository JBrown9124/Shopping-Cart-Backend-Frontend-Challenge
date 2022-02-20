var _			= require('underscore');
var pstack		= require('pstack');
var validator	= require('validator');


Giftcards = function(core, params, req, res) {
	var lib = {};
	lib = {
		api_key:	'f72fdf6c3f735191b25fadf4425aef4b',
		
		// Get the brand list for a given curency code
		brands: function(callback) {
			// Call the mock-api
			core.apicall("GET", "https://us-east1-non-prod.cloudfunctions.net/mock-api/inventory/brands", {
				api_key:		lib.api_key,
				currency_code:	params.currency_code
			}, function(response) {
				// Send back the response
				callback(response);
			});
		},
		
		// Process list of purchases
		purchase:function(callback) {
			
			if (!params.cart_items){
				callback(core.errorResponse('Invalid cart items', {code: 'invalid_cart_items'}));
				return false;
			}
			
			// Access user's balance from database to compare with user's balance on client.
			core.db().select().from('mock_partner_users').where('id', params.user_id).then((response)=>{
				console.log("get user's balance knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				if (!params.user_balance || !validator.isInt(params.user_balance) || response[0].balance_in_cents !== Number(params.user_balance)){
					callback(core.errorResponse('Invalid balance in cents', {code: 'invalid_balance_in_cents'}));
					return false;
				}
				
				var user_balance = response[0].balance_in_cents
				
				// Access user's cart total from database to compare with user's cart total on client
				core.db().select().from("mock_partner_cart_items").sum("value").where('cart_id', response[0].id).then(function(response) {
					console.log("sum of cart items value knex response:", response);
				
					if (user_balance < response[0]['sum(`value`)']) {
					callback(core.errorResponse('Cart total less than user balance', {code: 'insufficient_balance'}));
					return false;
					}
				
					// Handles multiple calls to the mock-api
					let processed_purchases = [];
					for (let i = 0; i < params.cart_items.length; i++) {
					  var processed_purchase = new Promise((resolve, reject) => {
						core.apicall(
						  "POST",
						  "https://us-east1-non-prod.cloudfunctions.net/mock-api/inventory/purchase",
						  {
							api_key: lib.api_key,
							brand_code: params.cart_items[i].brand_code,
							currency_code: params.cart_items[i].currency_code,
							value: params.cart_items[i].value,
						  },
						  function (response) {
							// If there is an error with one of the calls stop the loop and return the error.
							if (response.error) {
							  callback(response);
							  return false;
							}
						   resolve(response);
						  }
						);
					  });
					  processed_purchases.push(processed_purchase)
					}
					
					// Wait for promises to resolve before returning our response to client
					Promise.all(processed_purchases).then((response) => {
					  callback(response);
						});
					});
				});
			},
		
		// Get the available currency codes
		available_currency_codes: function(callback) {
			// Call the mock-api
			core.apicall("GET", "https://us-east1-non-prod.cloudfunctions.net/mock-api/inventory/available_currency_codes", {
				api_key:		lib.api_key
			}, function(response) {
				console.log("available currency codes response:", response);
				// Send back the response
				callback(response);
			});
		},
		
	};
	return lib;
}

module.exports = Giftcards;