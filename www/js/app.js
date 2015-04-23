// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js

var user = null;
var nu3App = angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova', 'nu3.services'])

.run(function($ionicPlatform, $state, DBService) {
  $ionicPlatform.ready(function() {
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

  .state('app.browse', {
    url: "/browse",
    views: {
      'menuContent': {
        templateUrl: "templates/browse.html"
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

  .state('app.single', {
    url: "/photolists/:photoId",
    views: {
      'menuContent': {
        templateUrl: "templates/photo.html",
        controller: 'PhotoCtrl'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/photolists');
});

nu3App.controller("PictureCtrl", function($scope, $cordovaCamera, $cordovaSQLite) {
    function getBase64FromImageUrl(URL) {
      encodeImageUri(URL, function(base64){
         var id = Date.now();
         var date = new Date().setTimeToNow();
         var title = $scope.photoTitle; //data DATETIME, rating INTEGER, synchronized INTEGER
         console.log("Saving photo " + id + " title: " + title);
         //IF connection? CriaImagem Webservice
         var query = "INSERT INTO photos (ID, title, base64, data, rating, synchronized) VALUES (?,?,?,?,?,?)";
        $cordovaSQLite.execute(db, query, [id, title, base64, date, 0, 0]).then(function(res) {
              console.log("INSERT ID -> " + res.insertId + " base: " + base64.slice(0,50));
              $scope.dbResult = "Sucesso";
          }, function (err) {
              $scope.dbResult = "Falha, tente novamente";
              console.error(err);
         });
      });
    }

    $scope.savePicture = function() {
      var imgURI = $scope.imgURI;
      console.log("Img URI: " + imgURI);
      getBase64FromImageUrl(imgURI);
      
      
    }

    encodeImageUri = function(imageUri, callback) {
      var c = document.createElement('canvas');
      var ctx = c.getContext("2d");
      var img = new Image();
      img.onload = function() {
          c.width = this.width;
          c.height = this.height;
          ctx.drawImage(img, 0, 0);

          if(typeof callback === 'function'){
              var dataURL = c.toDataURL("image/png");
              //console.log("DataURL original: " + dataURL);
              callback(dataURL.slice(22, dataURL.length));
          }
      };
      img.src = imageUri;
    }

    
 
    $scope.takePicture = function() {
        var options = { 
            quality : 75, 
            destinationType : Camera.DestinationType.IMAGE_URI, 
            sourceType : Camera.PictureSourceType.CAMERA, 
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
 
        $cordovaCamera.getPicture(options).then(function(imageData) {
            //$scope.imgURI = "data:image/jpeg;base64," + imageData;
            $scope.imgURI = imageData;
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }
 
});
