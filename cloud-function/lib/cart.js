var _			= require('underscore');
var pstack		= require('pstack');
var validator	= require('validator');
var fstool		= require('fs-tool');


Cart = function(core, params, req, res) {
	var lib = {};
	lib = {
		add_item:function(callback) {
			
			if (!params.cart_id || !validator.isInt(params.cart_id)) {
				callback(core.errorResponse('Invalid Cart ID', {code: 'invalid_user_id'}));
				return false;
			}
			
			if (!params.brand_code){
				callback(core.errorResponse('Invalid Brand Code', {code: 'invalid_brand_code'}));
				return false;
			}
			
			if (!params.value || isNaN(params.value) || !validator.isInt(params.value)){
				callback(core.errorResponse('Invalid Value', {code: 'invalid_value'}));
				return false;
			}	
			
			if (!params.currency_code){
				callback(core.errorResponse('Invalid Currency Code', {code: 'invalid_currency_code'}));
				return false;
			}
			
			if (!params.name){
				callback(core.errorResponse('Invalid Name', {code: 'invalid_name'}));
				return false;
			}
			
			if (!params.fund_currencyisocode){
				callback(core.errorResponse('Invalid Fund Currency ISO Code', {code: 'invalid_fund_currency_iso_code'}));
				return false;
			}
			
			var cart_item_data	= {
				cart_id: params.cart_id,
				brand_code: params.brand_code,
				value: params.value,
				currency_code: params.currency_code,
				name:params.name,
          		image_url: params.image_url,
          		fund_currencyisocode: params.fund_currencyisocode,
          		disclaimer: params.disclaimer,
          		description: params.description
			};
			
			core.db().insert(cart_item_data).into('mock_partner_cart_items').then(function(response) {
				console.log("insert cart item knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				core.db().select().from('mock_partner_cart_items').where('id', response[0]).then((response)=>{
					console.log("return inserted cart item knex response:", response);
					
					if (!response) {
						callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
						return false;
					}
					
					callback({ cart_item: response[0] });
				})
			});
		},
		
		remove_item:function(callback) {
			
			if (!params.cart_item_id || !validator.isInt(params.cart_item_id)) {
				callback(core.errorResponse('Invalid Cart ID', {code: 'invalid_cart_id'}));
				return false;
			}
			
			core.db().select().from('mock_partner_cart_items').where('id', params.cart_item_id).del().then(function(response) {
				console.log("delete cart item knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				callback({cart_item:response[0]});
			});
		},
		
		// Purchase is validated so now this stores the purchase info into our DB.
		check_out: function(callback) {
			
			if (!params.cart_id || !validator.isInt(params.cart_id)) {
				callback(core.errorResponse('Invalid Cart ID', {code: 'invalid_cart_id'}));
				return false;
			}
			
			if (!params.user_id || !validator.isInt(params.user_id)) {
				callback(core.errorResponse('Invalid User ID', {code: 'invalid_user_id'}));
				return false;
			}
			
			if (!params.cart_total_in_cents || !validator.isInt(params.cart_total_in_cents)){
				callback(core.errorResponse('Invalid Cart Total', {code: 'invalid_cart_total'}));
				return false;
			}

			core.db().select().from('mock_partner_users').where('id', params.user_id).then(function(response) {
				console.log("get users info knex response:", response);
				
				if (!response) {
					callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
					return false;
				}
				
				if (!params.user_balance || !validator.isInt(params.user_balance) || response[0].balance_in_cents !== Number(params.user_balance)){
					callback(core.errorResponse('Invalid balance in cents', {code: 'invalid_balance_in_cents'}));
					return false;
				}
				
				if (!params.purchase_items){
					callback(core.errorResponse('Invalid purchase items', {code: 'invalid_purchase_items'}));
					return false;
				}
				
				// Not reading as a number type so it must be converted
				var cart_total_in_cents = Number(params.cart_total_in_cents)
				
				if (response[0].balance_in_cents < cart_total_in_cents) {
					callback(core.errorResponse('Cart total less than user balance', {code: 'insufficient_balance'}));
					return false;
				}
				
				var new_balance_in_cents = response[0].balance_in_cents - cart_total_in_cents
				
				core.db().select().from("mock_partner_users").where('id', params.user_id).decrement({balance_in_cents: params.cart_total_in_cents}).then(function(response) {
					console.log("decrement user's balance knex response:", response);
					
					if (!response) {
						callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
						return false;
					}
					
					// Create a purchase row for user in purchases table
					core.db().insert({user_id: params.user_id}).into('mock_partner_purchases').then(function(response) {
						console.log("insert purchase id knex response:", response);
						
						if (!response) {
							callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
							return false;
						}
					
						var purchase_items_data = params.purchase_items.map((item) => {
							return {
        				    ...item,
        				    purchase_id: response[0],
        				    date: new Date(item.date),
        				    value: Number(item.value),
        				    quantity: Number(item.quantity),
        				  };
        				});
						
						// Take cart items being checked out and add to purchase items table
						core.db().insert(purchase_items_data).into('mock_partner_purchase_items').then(function(response) {
							console.log("insert purchased items knex response:", response);
							
							if (!response) {
								callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
								return false;
							}
							
							// Delete cart from carts table with cart ID
							core.db().select().from('mock_partner_carts').where('id', params.cart_id).del().then(function(response) {
								console.log("delete cart knex response:", response);
								
								if (!response) {
									callback(core.errorResponse('Something went wrong, please try again.', {code: 'invalid_sql_response'}));
									return false;
								}
								
								callback({
									new_balance_in_cents: new_balance_in_cents
								});
							})
						})
					});
				});
			})

		 	
		},
	};
	return lib;
}

module.exports = Cart;