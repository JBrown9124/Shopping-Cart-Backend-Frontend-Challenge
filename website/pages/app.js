(function(window) {
	window.app.directive('appPages', ['$timeout', function ($timeout) {
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
			
			// Import the core methods (ajax call, ...)
			$scope.core		= window.core;
			console.log("$scope.core	",$scope.core	);
			
			// Directive's methods
			$scope.main = {
				init:	function() {
					
				},
				onCartIconClick: function() {
		
					$scope.safeApply(function() {
						
						window.core.page = 'cart';
						
					});
					
					
				},
				onGiftCardsTitleClick: function() {
		
					$scope.safeApply(function() {
						
						window.core.page = 'giftcards';
						
					});
					
					
				}
			}
			
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
			templateUrl:	'pages/app.html'
		};
	}]);
})(window);