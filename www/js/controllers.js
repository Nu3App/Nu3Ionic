angular.module('starter.controllers', [])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, $ionicLoading, $state, $cordovaNetwork, UserService, DBService) {
  // Perform the login action when the user submits the login form
  /*$scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);
    
    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };*/
  // listen for Online event
    $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
      $scope.network = 'Online';
      $scope.$emit('network:changed');
      var onlineState = networkState;
    })

    // listen for Offline event
    $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
      $scope.network = 'Offline';
      $scope.$emit('network:changed');
      var offlineState = networkState;
    })

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
    var today = Date.today();
    userPromise.then(function(userResult){
        $ionicLoading.hide();
        if($cordovaNetwork.isOnline()){
          $scope.network = 'Online';
        }
        else $scope.network = 'Offline';

        if(userResult){
          user = userResult;
          console.log("User loaded = " + JSON.stringfy(userResult));
          $rootScope.token = user.token;
          console.log(Date.parse(userResult.token_date).getTime() + '>' + today.getTime());
        }
        else{
          console.log("Usuário Nulo ou Token Expirado");
          $state.go('login');
        }
        
    });
  });
 
  
})


.controller('PhotolistsCtrl', function($scope,$rootScope,$state, $ionicLoading, $cordovaNetwork, DBService, FeedService, ImagensServices) {
  var day = Date.today();
  $scope.feed = [];
  $scope.scroll = true;
  
  $rootScope.$on('todo:listChanged', function() {
    $scope.feed = [];
    ConstructFeed();
  });

  $rootScope.$on('todo:listAdded', function() {
    console.log('Event: todo:listAdded');
    if($scope.feed.length < 7){
      console.log("feed muito pequeno, carregando mais dados...");
      $scope.loadMore();
    }
  });

  $rootScope.$on('network:changed', function() {
    console.log("Event: Network changed!");
    var type = $cordovaNetwork.getNetwork()
    if(networkType != type){
      networkType = type;
      if($cordovaNetwork.isOnline()){
        $scope.online = true;
      }
      else{
        $scope.online = false;
        $scope.feed = [];
        ConstructFeed();
      }
      
    }
    
  });

  $scope.goHomeOnline = function(){
    $scope.homebtn = false;
    $scope.online = false;
    ConstructFeed();
  }

  DBService.getUser().then(function(){
    $scope.scrollCheck = function(){
      if($cordovaNetwork.isOnline() && $scope.scroll == true){ //TODO chamar webservice de primeira data.
        return true;
      }
      else return false;
    }
    ConstructFeed();
  });

 function ConstructFeed(){
    $ionicLoading.show({
      content: 'Loading Data',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 300
    });

    $scope.feed = [];

    if($cordovaNetwork.isOnline()){
      console.log("Preparando feed online!");
      $scope.scroll = true;
      ImagensServices.recuperaImagemData(Date.today(), Date.today().add(1).day()).then(
          function onFulfilled(ajaxData){
            console.log("AJAX promise fulfulled!");
            prepareFeed(ajaxData).then(function(){
              $ionicLoading.hide();
              $scope.$digest();
              console.log("Feed construido!");
              $scope.$emit('todo:listAdded');
            });

          },
          function onRejected(reason){
            console.log("Ajax Feed was Rejected because: " + JSON.stringify(reason));
            $ionicLoading.hide();
            $state.go('login');
          }
      );
    }
    else{
      console.log("Preparando feed offline!");
      $scope.scroll = false;
      offlineFeed().then(
        function(){
          $ionicLoading.hide();
          $scope.$digest();
        }
      );
    }
}

  $scope.sincronizar = function (){
    console.log("Sincronizar called!");
    if($cordovaNetwork.isOnline()){
      var qtd = $scope.feed.length;
      console.log("QTD: " + qtd);
      for (var i= 0; i< qtd; i++){
        sendAndUpdate($scope.feed[i], i);
      }
    }
  }

  function sendAndUpdate(image, index){
    console.log("Image " + index + " -> " + image.title);
    $scope.feed[index].synch = "Sincronizando...";
    ImagensServices.criaImagem(image.title, image.base64, image.ID).then(
      function onFulfilled(result){
        console.log("criaImagem Fulfilled = " + image.title)
        DBService.updatePhoto(image.ID, result).then(
          function onFulffilled(r){
            console.log("updatePhoto Fulfilled = " + image.title);
            $scope.feed[index].synch = "Sucesso";
            $scope.qtd--;
            if($scope.qtd == 0){
              $scope.homebtn = true;
              $scope.$digest();
            }
          },
          function onError(reason){
            console.log("Erro: " + JSON.stringify(reason));
          }
        )
      },
      function onError(){
        console.log("Cria Imagem error");
        $scope.feed[index].synch = "Erro ao fazer upload!";
        $scope.$digest();
      }
    );
  }
  

  $scope.loadMore = function (){
    console.log('Load More Call');
      $ionicLoading.show({
        content: 'Loading Data',
        animation: 'fade-in',
        showBackdrop: false,
        maxWidth: 200,
        showDelay: 300
    });
    day = day.add(-1).day();
    var end = day.clone().add(1).day();
    console.log("DIA: " + day);
      ImagensServices.recuperaImagemData(day, end).then(
        function onFulfilled(ajaxData){
          console.log("AJAX promise fulfulled!");
          prepareFeed(ajaxData).then(function(){
             $ionicLoading.hide();
             $scope.$broadcast('scroll.infiniteScrollComplete');
             $scope.$emit('todo:listAdded');
             console.log("Feed Extra Day construido!");
          });

        },
        function onRejected(reason){
          console.log("Ajax Feed was Rejected because: " + JSON.stringify(reason));
          $state.go('login');
        }
    );
  }

  function offlineFeed(){
    var deferred = Q.defer();
    var offlinePromise = DBService.loadOfflinePhotos().then(
      function onFulfilled(result){
        console.log("OfflinePromise fulfilled! " + JSON.stringify(result));
        if(result){
          $scope.qtd = result.length;
          for (var i = result.length - 1; i>=0; i--){
            //console.log(i + " -> " + JSON.stringify(result.item(i)));
            var image = result.item(i);
            var parsedDate = Date.parse(image.data);
            image['url'] = 'data:image/png;base64,' + image.base64;
            image['detail_url'] = "#";
            image['nome'] = image.title;
            image['data'] = "Tirado em: " + parsedDate.toString("dd/MM - hh:mm"); 
            $scope.feed.push(image);
            $scope.$digest();
          }
        }
        else{
          $scope.qtd = 0;
        }
        deferred.resolve(true);
      },
      function onRejected(reason){
        console.log("A promessa do offline foi rejeitada por algum motivo...");
        deferred.reject();
      }
    );
    return deferred.promise;
  }

  function prepareFeed(imagensData){
    var deferred = Q.defer();
    var dayAux = new Date(imagensData.stamp);
    console.log("Preparando Feed..." + imagensData.stamp);
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
            var parsedDate = Date.parse(json.data);
            json['url'] = 'data:image/png;base64,' + json.base64;
            json['detail_url'] = "#/app/photolists/" + json["idImagem"];
            json['data'] = "Tirado em: " + parsedDate.toString("dd/MM - hh:mm");
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
      console.error("Semana vazia..." + day);
      var week = {
        "emptyWeek": true,
        "date": ("0" + dayAux.getDate()).slice(-2) + "/" + ("0" + (dayAux.getMonth() + 1)).slice(-2) ,
        "detail_url": "#" 
      }
      $scope.feed.push(week);
      //console.log("Scope : " + JSON.stringify($scope.feed));
      $scope.$digest();
      deferred.resolve(true);
    } 
    return deferred.promise;

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
      console.log("me = " + user.nomeUsuario);
      $scope.me = user.nomeUsuario;
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
            $scope.$emit('todo:listChanged');
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

.controller("PictureCtrl", function($scope,$state, $cordovaCamera, $cordovaSQLite, $cordovaNetwork, DBService, ImagensServices) {
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
            quality : 90, 
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
         if($cordovaNetwork.isOnline()){
          ImagensServices.criaImagem(image.nome, base64, new Date().getTime()).then(
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
              console.log("Erro no AJAX de criar foto: " + JSON.stringify(err));
            }
          );
        }
        else{
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