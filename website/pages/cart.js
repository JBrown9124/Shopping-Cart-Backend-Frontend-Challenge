(function (window) {
  window.app.directive("appCart", [
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
          processing_purchase: false, // Processing purchase status

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

          processed_purchase: {
            //Storage for purchase being processed
            date: "",
            items: [],
          },
          
          // Init() executed when the directive loads
          init: function () {
            window.core.user_purchase_history = [];

            window.core.apicall({
              url: window.api_server + "/user/available_purchase_history",
              params: {
                user_id: window.core.user_id,
              },
              callback: function (response) {
                $scope.safeApply(function () {
                  if (response.error) {
                    $scope.main.error.is_error = true;
                    $scope.main.error.message = response.message;
                    $scope.main.error.code = response.code;
                    throw new Error(response.code);
                  }

                  window.core.user_purchase_history = response; // Obtain & store the user's purchase history
                  $scope.main.loading = false;
                });
              },
            });
          },
          
          onRemoveFromCart: function (selected_item) {
            window.core.apicall({
              url: window.api_server + "/user/available_cart/remove_item",
              params: {
                cart_item_id: selected_item.id,
              },
              callback: function (response) {
                $scope.safeApply(function () {
                  if (response.error) {
                    $scope.main.error.is_error = true;
                    $scope.main.error.message = response.message;
                    $scope.main.error.code = response.code;
                    $scope.main.success.is_success = false;
                    throw new Error(response.code);
                  }

                  $scope.main.loading = false;

                  // If our design calls for having more than one item removed at once, our filter and reduce functions will handle it
                  // Filter and reduce also help validate the amount of cart items
                  window.core.user_cart.items =
                    window.core.user_cart.items.filter((item) => {
                      return selected_item.id !== item.id;
                    });

                  window.core.user_cart.total_in_cents =
                    window.core.user_cart.items.reduce(function (
                      accumulator,
                      item
                    ) {
                      return accumulator + item.value;
                    },
                    0);

                  $scope.main.success.is_success = true;
                  $scope.main.success.message = "Item removed.";
                  $scope.main.success.code = "item_removed";
                });
              },
            });
          },

          onCheckOut: function () {
            // Ensure user has enough funds
            if (
              window.core.user_cart.total_in_cents > window.core.user_balance
            ) {
              $scope.main.is_error = true;
              $scope.main.error_message = "Insufficient funds.";
              $scope.main.error.code = "insufficient_funds";
              return false;
            }

            // Ensure user has at least one item in their cart
            if (window.core.user_cart.items.length === 0) {
              $scope.main.is_error = true;
              $scope.main.error_message = "Your cart is empty.";
              $scope.main.error.code = "empty_cart";
              return false;
            }

            processCartItems();

            function processCartItems() {
              $scope.safeApply(function () {
                $scope.main.processing_purchase = true;
              });
              window.core.apicall({
                url: window.api_server + "/purchase",
                params: {
                  user_id: window.core.user_id,
                  user_balance: window.core.user_balance, //Validate user's balance
                  cart_items: window.core.user_cart.items, //Takes a list of cart items
                },
                callback: function (response) {
                  $scope.safeApply(function () {
                    console.log("processCartItems response:", response);

                    if (response.error) {
                      $scope.main.error.is_error = true;
                      $scope.main.error.message = response.message;
                      $scope.main.error.code = response.code;
                      $scope.main.processing_purchase = false;
                      $scope.main.success.is_success = false;
                      throw new Error(response.code);
                    }

                    $scope.main.processed_purchase.items = response;
                    $scope.main.processed_purchase.date = response[0].date;
                    //Let user see recent purchase at the top of purchase history
                    window.core.user_purchase_history.unshift(
                      $scope.main.processed_purchase
                    );

                    // If the processing of our purchase is successful record the purchase and its items in our DB, then update the client
                    recordPurchasedItems(response);
                  });
                },
              });
            }
            function recordPurchasedItems(processed_purchases) {
              window.core.apicall({
                url: window.api_server + "/user/available_cart/check_out",
                params: {
                  purchase_items: processed_purchases,
                  user_id: window.core.user_id,
                  cart_id: window.core.user_cart.id,
                  cart_total_in_cents: window.core.user_cart.total_in_cents,
                  user_balance: window.core.user_balance,
                },
                callback: function (response) {
                  $scope.safeApply(function () {
                    console.log("recordPurchasedItems response:", response);
                    
                    if (response.error) {
                      $scope.main.error.is_error = true;
                      $scope.main.error.message = response.message;
                      $scope.main.error.code = response.code;
                      $scope.main.processing_purchase = false;
                      $scope.main.success.is_success = false;
                      throw new Error(response.code);
                    }

                    window.core.user_balance = response.new_balance_in_cents;
                    window.core.user_cart.items = [];
                    window.core.user_cart.id = "";
                    window.core.user_cart.total_in_cents = 0;
                    $scope.main.processing_purchase = false;

                    $scope.main.success.is_success = true;
                    $scope.main.success.message = "Checkout completed!";
                    $scope.main.success.code = "checkout_completed";
                  });
                },
              });
            }
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
        templateUrl: "pages/cart.html",
      };
    },
  ]);
})(window);
