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


.controller('PhotolistsCtrl', function($scope,$rootScope,$state, DBService, FeedService, ImagensServices) {
  var today = Date.today().add(1).days();
  var lastSunday = Date.parse("last sunday");
  var beginningDate = Date.parse("last sunday");
  var endingDate = Date.today().add(1).days();
  $scope.feed = [];

  $rootScope.$on('todo:listChanged', function() {
    $scope.feed = [];
    ConstructFeed();
  });

  DBService.getUser().then(function(){
    ConstructFeed();
  });
   function ConstructFeed(){
    ImagensServices.recuperaImagemData(lastSunday, today).then(
        function onFulfilled(ajaxData){
          console.log("AJAX promise fulfulled!");
          prepareFeed(ajaxData).then(function(){
            console.log("Feed construido!");
          });

        },
        function onRejected(reason){
          console.log("Ajax Feed was Rejected because: " + JSON.stringify(reason));
        }
    );
  }

  function ConstructExtraWeekFeed(){
    endingDate = beginningDate.clone();
    beginningDate = beginningDate.addWeeks(-1);
      ImagensServices.recuperaImagemData(beginningDate, endingDate).then(
        function onFulfilled(ajaxData){
          console.log("AJAX promise fulfulled!");
          prepareFeed(ajaxData);

        },
        function onRejected(reason){
          console.log("Ajax Feed was Rejected because: " + JSON.stringify(reason));
        }
    );
  }
  function prepareFeed(imagensData){
    var deferred = Q.defer();
    console.log("Preparando Feed...");
    if(imagensData && imagensData.length > 0){
      console.log("Semana não vazia:");
      var previousWeekend = null;
      var imagePromises = []; //Array de promeças para cada imagem carregada no loop

      for (var i = imagensData.length - 1; i>=0; i--){
        console.log("Getting index " + i + " data...");
        //idImagem , nome, data, rating, descricao, ultimoComentario (idComentario, nomeUsuario, texto, dataEnvio)
        var returnedValues = FeedService.buildPhotoJson(imagensData[i], previousWeekend);
        var json = returnedValues[0];
        previousWeekend = returnedValues[1];
        console.log("Pre-json builded!");

        //precisa fazer uma promisse para carregar o base64 do SQLite
        json["index"] = i;
        var basePromise = FeedService.findPhotoBase(json).then(
          function onFulfilled(json){
            console.log("Achou a foto? Finally!!!  " + json["idImagem"]);
            //console.log("Imagem: " + JSON.stringify(json));
            json['url'] = 'data:image/png;base64,' + json.base64;
            $scope.feed.push(json);
            $scope.$digest();
          },
          function onRejected(reason){
            console.log("Algo deu errado...");
          }
        );
        imagePromises.push(basePromise); //adiciona no array de promeças, a promeça que eventualmente essa foto sera carregada.
        
      }//End -> for
      Q.all(imagePromises).then(function(){
        console.log("Todas as promessas do feed foram cumpridas...");
        //Todas promessas foram compridas, então resolva a promessa do conjunto todo:
        deferred.resolve(true);
      });

    }
    else{ //semana vazia, ou seja, sem feed algum
      console.log("Semana vazia...");
      console.log("Scopo: " + $scope.feed);
      var week = {
        "emptyWeek": true,
        "date": ("0" + beginningDate.getDate()).slice(-2) + "/" + ("0" + (beginningDate.getMonth() + 1)).slice(-2)  
      }
      $scope.feed.push(week);
      console.log("Scope : " + JSON.stringify($scope.feed));
      $scope.$digest();
      deferred.resolve(true);
    } 
    return deferred.promise;

  }
  $scope.loadList = function() {
      //var imgURI = $scope.imgURI;
      //console.log("Img URI: " + imgURI);
      //var base64 = getBase64FromImageUrl(imgURI);
      //var id = Date.now();
      ConstructExtraWeekFeed();

      /*$scope.photolists = [];
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
      });*/
    }

    $scope.camera = function(){
      $state.go('app.camera');
    }

})

.controller('PhotoCtrl', function($scope, $stateParams, DBService, $ionicLoading, ImagensServices) {
  console.log("detalhes: " + JSON.stringify($stateParams));
  $ionicLoading.show({
      content: 'Carregando Detalhes',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 300
  });

  $scope.commentField = {
    text: ''
  }

  $scope.comentar = function(){
    var commentText = $scope.commentField.text;
    console.log("Criando comentario> " + commentText +  " trim> " + commentText.trim());
    commentText = commentText.trim();
    if(commentText.length > 0){
      $scope.warning = null;
      ImagensServices.criaComentario($stateParams.id, commentText).then(
        function onSuccess(){
          console.log("Comentario Salvo com Sucesso! " + new Date().toString("hh:mm"));
          $scope.commentField.text = "";
          var comment = {
            'dataEnvio' : "Agora às " + new Date().toString("hh:mm"),
            'nomeUsuario' : user.username,
            'texto': commentText
          }
          $scope.comentarios.push(comment);
          $scope.$digest();
        },
        function onError(){
          //ToDO Display Error Notification
        }
      );
    }
    else{
      $scope.warning = true;
    }
    
  }

  DBService.loadPhoto($stateParams.id).then(
      function(result){
          //console.log("Dados carregados do banco de dados: " + JSON.stringify(result));
          $ionicLoading.hide();
          $scope.photo = result;
          $scope.photo.url = 'data:image/png;base64,' + result.base64;
          var date = Date.parse(result.data);
          $scope.photo.stars = [];
          $scope.photo.starsEmpty = [];
          for(var j=1; j<= 5; j++){
            if(j <= result.rating) $scope.photo.stars.push(1);
            else $scope.photo.starsEmpty.push(1);
          }
          $scope.photo.day = date.toString("dd/MM/yy");
          $scope.photo.hour = date.toString("hh:mm");
          $scope.$digest();
        }
  )

  ImagensServices.recuperaComentarios($stateParams.id).then(
    function(comentarios){
      console.log("me = " + user.username);
      $scope.me = user.username;
      $scope.comentarios = comentarios;
      $scope.digest();
    }
  )
  
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
          result.email = $scope.user.email;
          user = result;
         $scope.user.senha = null;
         
         DBService.insertUser(result).then(function(){
            console.log("Dados do usuário inseridos no banco de dados...");
            $state.go('app.photolists');
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
})

.controller("PictureCtrl", function($scope,$state, $cordovaCamera, $cordovaSQLite, DBService, ImagensServices) {
    $scope.savePicture = function() {
      if(!$scope.photoTitle){
        $scope.blankTitle = true;
      }
      else{
        $scope.blankTitle = false;
        var imgURI = $scope.imgURI;
        console.log("Img URI: " + imgURI);
        getBase64FromImageUrl(imgURI); 
      }
      
    }

    $scope.reloadHome = function(){
      $scope.$emit('todo:listChanged');
      $state.go('app.photolists');
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

    function getBase64FromImageUrl(URL) {
      encodeImageUri(URL, function(base64){
         var id = Date.now();
         var image = {
          'idImagem': id, 
          'nome': $scope.photoTitle, 
          'base64': base64,
          'data': new Date().setTimeToNow(), 
          'rating': 0
         }
        ImagensServices.criaImagem(image.nome, base64).then(
          function onSuccess(id){
            console.log("Imagem criada no servidor com id: " + id);
            image.idImagem = id;
            DBService.addPhoto(image, base64, 1).then(
              function onSuccess(){
                  $scope.dbResult = "Imagem salva e sincronizada com sucesso!";
                  $scope.$digest();
                  
              },
              function onError(){
                  $scope.dbResult = "Falha, tente novamente";
                  $scope.$digest();
              }
            );
          },
          function onError(err){
            DBService.addPhoto(image, base64, 0).then(
              function onSuccess(){
                  $scope.dbResult = "Imagem salva localmente com sucesso!";
                  $scope.$digest();
              },
              function onError(){
                  $scope.dbResult = "Falha, tente novamente";
                  $scope.$digest();
              }
            );
          }
        );
      });
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

    
 
});