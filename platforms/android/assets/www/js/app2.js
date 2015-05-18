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

  .state('tabs', {
      url: "/tab",
      abstract: true,
      templateUrl: "tabs.html",
      controller: 'AppCtrl'
    })
  .state('tabs.photolists', {
      url: "/photolists",
      views: {
        'photolists-tab': {
          templateUrl: "templates/photolists.html",
          controller: 'PhotolistsCtrl'
        }
      }
    })
  .state('tabs.details', {
    url: "/photolists/:id",
    views: {
      'photolists-tab': {
        templateUrl: "templates/photo.html",
        controller: 'PhotoCtrl'
      }
    }
  })
  .state('tabs.camera', {
    url: "/camera",
    views: {
      'camera-tab': {
        templateUrl: "templates/camera.html"
      }
    }
  })
  .state('tabs.search', {
    url: "/search",
    views: {
      'search-tab': {
        templateUrl: "templates/search.html"
      }
    }
  })
  .state('login', {
      url: "/login",
      //animation: 'slide-in-up',
      templateUrl: "templates/login.html"
  })
  .state('register', {
      url: "/register",
      animation: 'slide-in-up',
      templateUrl: "templates/register.html"
  })
  .state('about', {
    url: "/about",
    views: {
      'menuContent': {
        templateUrl: "templates/about.html"
      }
    }
  })
    
  
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/photolists');
});
