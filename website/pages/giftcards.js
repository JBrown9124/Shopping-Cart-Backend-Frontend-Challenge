(function (window) {
  window.app.directive("appGiftcards", [
    "$timeout",
    function ($timeout) {
      var component = function ($scope, element, attrs, ctlr, transcludeFn) {
        // Utilities
        $scope.safeApply = function (fn) {
          var phase = this.$root.$$phase;
          if (phase == "$apply" || phase == "$digest") {
            if (fn && typeof fn === "function") {
              fn();
            }
          } else {
            this.$apply(fn);
          }
        };

        // Import the core methods (ajax call, ...) & shared data
        $scope.core = window.core;

        // Directive's methods
        $scope.main = {
          loading: true, // Loading status

          selected_brand: null, // To hold the selected brand

          brand_balance_in_cents: null, // To hold the brand balance

          brands: null, // To hold the brands

          error: {
            is_error: false,
            message: null,
            code: null,
          },

          success: {
            is_success: false,
            message: null,
            code: null,
          },

          // Init() executed when the directive loads
          init: function () {
            window.core.user_cart = {
              id: null,
              items: [],
              total_in_cents: 0,
              amount_limit: 5,
            };

            window.core.apicall({
              url: window.api_server + "/brands",
              params: {
                currency_code: window.core.currency_code,
              },
              callback: function (response) {
                $scope.safeApply(function () {
                  console.log("/brands response:", response);
                  if (response.error) {
                    $scope.main.error.is_error = true;
                    $scope.main.error.message = response.message;
                    $scope.main.error.code = response.code;
                    $scope.main.success.is_success = false;
                    throw new Error(response.code);
                  }

                  $scope.main.loading = false;
                  $scope.main.brands = response;
                });
              },
            });

            // If cart is not already loaded, then load it.
            if (!window.core.user_cart.id) {
              window.core.apicall({
                url: window.api_server + "/user/available_cart",
                params: {
                  user_id: window.core.user_id,
                },
                callback: function (response) {
                  $scope.safeApply(function () {
                    console.log("/user/available_cart response:", response);
                    if (response.error) {
                      $scope.main.error.is_error = true;
                      $scope.main.error.message = response.message;
                      $scope.main.error.code = response.code;
                      $scope.main.success.is_success = false;
                      throw new Error(response.code);
                    }

                    window.core.user_cart.items = response.cart_items; // Obtain & store the user's cart
                    window.core.user_cart.id = response.cart_id; // Obtain & store the user's cart ID
                    window.core.user_cart.total_in_cents =
                      response.cart_total_in_cents; // Obtain & store the user's cart total'
                  });
                },
              });
            }
          },
          onBrandSelect: function (brand_selection) {
            // Store the selected brand in component's scope
            $scope.safeApply(function () {
              $scope.main.selected_brand = brand_selection;
              
              // Clear error
              $scope.main.error.is_error = false;
              $scope.main.success.is_success = false;
            });
          },

          // When input is changed, update the brand balance.
          onBrandBalanceChange: function (value_in_dollars) {
            $scope.safeApply(function () {
              $scope.main.brand_balance_in_cents = value_in_dollars * 100; // Store the brand balance the user wishes to purchase in component's scope
            });
          },

          onAddToCart: function () {
            // Ensure brand balance below minimum or above maximum (undefined value)
            if (
              $scope.main.brand_balance_in_cents >
                $scope.main.selected_brand.max_price_in_cents ||
              $scope.main.brand_balance_in_cents <
                $scope.main.selected_brand.min_price_in_cents
            ) {
              return $scope.safeApply(function () {
                $scope.main.error.is_error = true;
                $scope.main.error.message =
                  "Please make sure the balance selected is between the minimum and maximum balance.";
                $scope.main.error.code = "invalid_brand_balance";
                $scope.main.success.is_success = false;
              });
            }

            // Ensure user has enough balance to add another item to their cart
            if (
              window.core.user_balance <
              window.core.user_cart.total_in_cents +
                $scope.main.brand_balance_in_cents
            ) {
              return $scope.safeApply(function () {
                $scope.main.error.is_error = true;
                $scope.main.error.message =
                  "Adding this item to your cart would exceed your balance.";
                $scope.main.error.code = "insufficient_funds";
                $scope.main.success.is_success = false;
              });
            }

            // Ensure user does not exceed the amount of items allowed in their cart
            if (
              window.core.user_cart.items.length + 1 >
              window.core.user_cart.amount_limit
            ) {
              return $scope.safeApply(function () {
                $scope.main.error.is_error = true;
                $scope.main.error.message = `Allowed up to ${window.core.user_cart.amount_limit} items in your cart.`;
                $scope.main.error.code = "invalid_amount_of_items";
                $scope.main.success.is_success = false;
              });
            }

            window.core.apicall({
              url: window.api_server + "/user/available_cart/add_item",
              params: {
                cart_id: window.core.user_cart.id,
                brand_code: $scope.main.selected_brand.brand_code,
                value: $scope.main.brand_balance_in_cents,
                currency_code: window.core.currency_code,
                name: $scope.main.selected_brand.name,
                image_url: $scope.main.selected_brand.image_url,
                fund_currencyisocode:
                  $scope.main.selected_brand.fund_currencyisocode,
                disclaimer: $scope.main.selected_brand.disclaimer,
                description: $scope.main.selected_brand.description,
              },
              callback: function (response) {
                $scope.safeApply(function () {
                  console.log("onAddCart response:", response);

                  if (response.error) {
                    $scope.main.error.is_error = true;
                    $scope.main.error.message = response.message;
                    $scope.main.error.code = response.code;
                    $scope.main.success.is_success = false;
                    throw new Error(response.code);
                  }

                  // Add item to our cart to show client update
                  window.core.user_cart.items.push(response.cart_item);

                  // If our design calls for adding more than one cart item at a time then this reduce will handle it
                  // Reduce also helps validate the number of cart items
                  window.core.user_cart.total_in_cents =
                    window.core.user_cart.items.reduce(function (
                      accumulator,
                      item
                    ) {
                      return accumulator + item.value;
                    },
                    0);

                  $scope.main.error.is_error = false;
                  $scope.main.success.is_success = true;
                  $scope.main.success.message = `${$scope.main.selected_brand.name} has been added to your cart!`;
                  $scope.main.success.code = "cart_item_added";
                });
              },
            });
          },
        };

        // Wait for render then init()
        $timeout(function () {
          $scope.main.init();
        });

        // Executes when the directive unloads
        $scope.$on("$destroy", function () {});
      };
      return {
        link: component,
        scope: {},
        templateUrl: "pages/giftcards.html",
      };
    },
  ]);
})(window);
