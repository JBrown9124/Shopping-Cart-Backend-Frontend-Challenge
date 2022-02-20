(function(window) {
	window.app.directive('appIndex', ['$timeout', function ($timeout) {
		var component = function($scope, element, attrs, ctlr, transcludeFn) {

			// Utilities
			$scope.safeApply = function(fn) {
				var phase = this.$root.$$phase;
				if(phase == '$apply' || phase == '$digest') {
					if(fn && (typeof(fn) === 'function')) {
						fn();
					}
				} else {
					this.$apply(fn);
				}
			};
			
			// Import the core methods (ajax call, ...) & shared data
			$scope.core		= window.core;
			
			// Directive's methods
			$scope.main = {
				loading:				false,	// Loading status
				selected_currency_code:	null,	// To hold the selected currency code
				// Init() executed when the directive loads
				init:	function() {
					$scope.safeApply(function() {
						$scope.main.loading	= true;
					});
					window.core.apicall({
						url:		window.api_server+'/available_currency_codes',
						params:		{},
						callback:	function(response) {
							console.log('/available_currency_codes response:', response);
							$scope.safeApply(function() {
								$scope.main.loading	= false;
								
								if (!response.currency_codes) {
									alert("Failed to load the list of available currency codes");
									return false;
								}
								
								$scope.main.currency_codes	= response.currency_codes;
								
							});
						}
					});
				},
				
				

				// When the user clicks the button
				onBrowse:	function() {
					
					// Store the selected currency code & email on the core shared object
					window.core.currency_code	= $scope.main.selected_currency_code;
					window.core.user_email		= $scope.main.user_email;
					
					// Load the user's available balance
					$scope.safeApply(function() {
						$scope.main.loading	= true;
					});
					
					window.core.apicall({
						url:		window.api_server+'/user/available_balance',
						params:		{
							email:			window.core.user_email,
							currency_code:	window.core.currency_code
						},
						callback:	function(response) {
							console.log("onBrowse response:",response);
							$scope.safeApply(function() {
								$scope.main.loading	= false;
								window.core.user_balance	= response.balance_in_cents;	// Obtain & store the user's available balance (in cents)
								window.core.user_id = response.id 		// Obtain & store the user's id
								// Change the page, angular on app.html will detect the change and display the proper directive
								window.core.page			= 'giftcards';
							});
						}
					});
				}
			};
			
			// Wait for render then init()
			$timeout(function() {
				$scope.main.init();
			});
			
			// Executes when the directive unloads
			$scope.$on('$destroy', function() {
				
			});
		}
		return {
			link: 			component,
			scope:			{},
			templateUrl:	'pages/index.html'
		};
	}]);
})(window);