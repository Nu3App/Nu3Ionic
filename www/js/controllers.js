angular.module('starter.controllers', [])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, $ionicLoading, $state, UserService, DBService) {
  // Perform the login action when the user submits the login form
  /*$scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);
    
    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };*/
  

  $ionicLoading.show({
      content: 'Loading Data',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 300
  });

  DBService.status().then(function(){
    console.log("Promessa do banco de dados cumprida...");
    //UserService.init();
    var userPromise = DBService.loadUser();
    userPromise.then(function(userResult){
        $ionicLoading.hide();
        if(userResult){
          user = userResult;
          console.log("User loaded = " + JSON.stringfy(userResult));
          $rootScope.token = user.token;
        }
        else{
          console.log("Usuário Nulo");
          $state.go('login');
        }
        
    });
  });
 
  
})


.controller('PhotolistsCtrl', function($scope,$rootScope, $cordovaSQLite, $ionicModal, DBService) {
  
  console.log ("User: " + JSON.stringify(user));
  $scope.loadList = function() {
      //var imgURI = $scope.imgURI;
      //console.log("Img URI: " + imgURI);
      //var base64 = getBase64FromImageUrl(imgURI);
      //var id = Date.now();
      $scope.photolists = [];
      var query = "SELECT * FROM photos";
      $cordovaSQLite.execute(db, query).then(function(res) {
          if(res.rows.length > 0) {
              for(var i=0; i<res.rows.length; i++){
                //console.log("SELECTED -> " + res.rows.item(i).ID + " " + res.rows.item(i).base64);
                //console.log("Imagem: " + JSON.stringify(res.rows.item(i)));
                var date = Date.parse(res.rows.item(i).data);
                var image = {
                  id: res.rows.item(i).ID,
                  title: res.rows.item(i).title,
                  date: date.toString("d/M - HH:mm"),
                  url:  "data:image/jpeg;base64," + res.rows.item(i).base64
                }
                $scope.photolists.push(image);
              }
              
          } else {
              console.log("No results found");
          }
      }, function (err) {
          console.error(err);
      });
    }

})

.controller('PhotoCtrl', function($scope, $stateParams) {
})

.controller('LoginCtrl', function($scope, $http,$ionicModal, $cordovaSQLite, $state, AuthenticationService, UserService, DBService) {
  $scope.message = "";
  
  $scope.user = {
    email: null,
    senha: null
  };
 
  $scope.login = function() {
    AuthenticationService.login($scope.user).then(
        function onFulfilled(result){
          console.log("Usuario logado: " + result.idUsuario);
          result.email = $scope.username;
          user = result;
         $scope.username = null;
         $scope.password = null;
         
         DBService.insertUser(result).then(function(){
            console.log("Dados do usuário inseridos no banco de dados...");
            $state.go('/app/photolists');
         });
        },
        function onRejected(reason, status){
          //do error handling
          var error = "Login failed.";
          //if (status == 401) {
          //  error = "Invalid Username or Password.";
          //}
          $scope.message = error;
        }

      );
  };

  /*$scope.$on('event:auth-loginRequired', function(e, rejection) {
    console.log('handling login required');
    $scope.loginModal.show();
  });*/  
});