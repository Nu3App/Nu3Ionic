// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js

var user = null;
var networkType = null;
var nu3App = angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova', 'nu3.services'])

.run(function($ionicPlatform, $state, DBService, $cordovaNetwork, $rootScope) {
  $ionicPlatform.ready(function() {
    networkType = $cordovaNetwork.getNetwork()

    var isOnline = $cordovaNetwork.isOnline()

    var isOffline = $cordovaNetwork.isOffline()


    
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    //db = $cordovaSQLite.openDB("my.db");
    DBService.init()
  });

  $ionicPlatform.registerBackButtonAction(function (event) {
    if($state.current.name=="app.photolists" || $state.current.name=="login"){
      navigator.app.exitApp();
    }
    else{
      navigator.app.backHistory();  
    }
    
  }, 100);
})

.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
  $httpProvider.defaults.useXDomain=true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];

  $stateProvider

  .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/menu.html",
    controller: 'AppCtrl'
  })

  .state('login', {
      url: "/login",
      //animation: 'slide-in-up',
      templateUrl: "templates/login.html"
  })

  .state('app.camera', {
    url: "/camera",
    views: {
      'menuContent': {
        templateUrl: "templates/camera.html"
      }
    }
  })

  .state('app.search', {
    url: "/search",
    views: {
      'menuContent': {
        templateUrl: "templates/search.html"
      }
    }
  })

  .state('app.about', {
    url: "/about",
    views: {
      'menuContent': {
        templateUrl: "templates/about.html"
      }
    }
  })
    .state('app.photolists', {
      url: "/photolists",
      views: {
        'menuContent': {
          templateUrl: "templates/photolists.html",
          controller: 'PhotolistsCtrl'
        }
      }
    })

  .state('app.details', {
    url: "/photolists/:id",
    
    views: {
      'menuContent': {
        templateUrl: "templates/photo.html",
        controller: 'PhotoCtrl'
      }
    }/*,
    resolve: {
          details: function($stateParams, DetailsService) {
            console.log("Resolving: " + $stateParams.photoId);
            return DetailsService.getDetail($stateParams.photoId)
          }
    }*/
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/photolists');
})

.directive('navClear', [
  '$ionicViewService',
  '$state',
  '$location',
  '$window',
  '$rootScope',
function($ionicHistory, $location, $state, $window, $rootScope) {
  $rootScope.$on('$stateChangeError', function() {
    $ionicHistory.nextViewOptions({
      disableAnimate: false,
      disableBack: true
    });
  });
  return {
    priority: 100,
    restrict: 'AC',
    compile: function($element) {
      return { pre: prelink };
      function prelink($scope, $element, $attrs) {
        var unregisterListener;
        function listenForStateChange() {
          unregisterListener = $scope.$on('$stateChangeStart', function() {
            $ionicHistory.nextViewOptions({
              disableAnimate: true,
              disableBack: true
            });
            unregisterListener();
          });
          $window.setTimeout(unregisterListener, 300);
        }

        $element.on('click', listenForStateChange);
      }
    }
  };
}]);
