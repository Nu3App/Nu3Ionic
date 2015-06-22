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
    DBService.loadUser().then(function(userResult){
        console.log("User promise fulfilled!");
        $ionicLoading.hide();
        /*if($cordovaNetwork.isOnline()){
          $scope.network = 'Online';
        }
        else{
          $scope.network = 'Offline';
        } 
        */
        if(userResult != null){
          user = userResult;
          $rootScope.token = user.token;
          var today = Date.today();
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
  var promiseList = [];
  $scope.feed = [];
  $scope.offlinePhotos = [];
  $scope.scroll = false;
  $scope.qtd = 0;
  $scope.emptyDays = null;
  var emptySince = null;

  $rootScope.$on('todo:listChanged', function() {
    $scope.feed = [];
    promiseList = [];
    day = Date.today();
    ConstructFeed();
  });

  $rootScope.$on('todo:listAdded', function() {
    $scope.$digest();
    console.log('Event: todo:listAdded');
    $scope.$broadcast('scroll.infiniteScrollComplete');
    if($scope.feed.length < 3){
      console.log("feed muito pequeno, carregando mais dados...");
      $scope.loadMore();
    }
    else{
      $ionicLoading.hide();
      $scope.scroll = true;
    }
  });

  $rootScope.$on('network:changed', function() {
    console.log("Event: Network changed!");
    var type = $cordovaNetwork.getNetwork()
    if(networkType != type){
      networkType = type;
      if($cordovaNetwork.isOnline()){
        $scope.online = true;
        if($scope.qtd == 0) ConstructFeed();
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
    $scope.qtd = false;
    ConstructFeed();
  }

  $scope.scrollCheck = function(){
      //console.log("Checando Requerimentos para o Scroll Infinito...");
      if($scope.scroll == true && $cordovaNetwork.isOnline()){ //TODO chamar webservice de primeira data.
        return true;
      }
      else return false;
    }

  DBService.getUser().then(function(userResult){
    console.log("Usuario carregado: " + JSON.stringify(userResult));
    ConstructFeed();
  });

  var sort_by = function(field, reverse, primer){
   var key = primer ? 
       function(x) {return primer(x[field])} : 
       function(x) {return x[field]};

   reverse = !reverse ? 1 : -1;
   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     } 
  }

  function buildEmptyCycle(day){
    if(!$scope.emptyDays){
      $scope.emptyDays = "Sem coletas no dia " + day;
      emptySince = day;
    }
    else{
      $scope.emptyDays = "Sem coletas do dia " + emptySince + " até " + day;
    }
    
  }

 function ConstructFeed(){
    console.log("ConstructFeed Call");
    $ionicLoading.show({
      content: 'Loading Data',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 300
    });

    
    $scope.feed = [];
    $scope.offlinePhotos = [];

    offlineFeed().then(function(offlineContent){
      var netStatus = $cordovaNetwork.isOnline();
      console.log("Offline Lib return: " + offlineContent + " netstatus: " + netStatus + !netStatus);
      if(offlineContent || !netStatus){
        console.log("SCOPO = OFFLINE!");
        $scope.offlineFeed = true;
        $scope.message = "Você não está conectado. Suas fotos serão salvas localmente e sincronizadas com nosso server quando você estiver conectado."
        netStatus ? $scope.online = true : $scope.online = false;

        //console.log("Offline feed: " + JSON.stringify($scope.offlinePhotos));
        if(offlineContent){
          $scope.qtd = offlineContent.qtd;
          $scope.offlinePhotos = offlineContent.photos;
          console.log("offline content = " + JSON.stringify($scope.offlinePhotos).substring(0,80));
        }
        else $scope.qtd = 0;
        $scope.$digest();
        $scope.scroll = false;
        $ionicLoading.hide();
        
        //existe photos para sincronizar...
      }
      else{
        if(netStatus){
          $scope.offlineFeed = false;
          console.log("Preparando feed online!");
          $scope.scroll = true;
          var dayEntry = {
            photos: [],
            label: day.toString("dd/MM"),
            cycle: false 
          }
          ImagensServices.recuperaImagemData(Date.today(), Date.today().add(1).day()).then(
              function onFulfilled(ajaxData){
                console.log("AJAX promise fulfulled!");
                prepareFeed(ajaxData).then(function(photos){
                  if(photos){
                    dayEntry.photos = photos;
                    if($scope.emptyDays){
                      dayEntry.cycle = $scope.emptyDays;
                      $scope.emptyDays = null;
                    }
                    $scope.feed.push(dayEntry);
                  }
                  else{
                    console.log("Entrada vazia nesse dia...");
                    buildEmptyCycle(dayEntry.label);
                  }
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
      }
    })
  }

  $scope.loadMore = function (){
    $scope.scroll = false;
    day = day.add(-1).day();
    var end = day.clone().add(1).day();
    var dayEntry = {
      photos: [],
      label: day.toString("dd/MM") 
    }
    $ionicLoading.show({
        content: 'Loading Data',
        animation: 'fade-in',
        showBackdrop: false,
        maxWidth: 200,
        showDelay: 300
    });
    console.log("Load More Day: " + day.toString("dd/MM"));
      ImagensServices.recuperaImagemData(day, end).then(
        function onFulfilled(ajaxData){
          console.log("AJAX promise fulfulled!");
          prepareFeed(ajaxData).then(function(photos){
            if(photos){
              dayEntry.photos = photos;
              if($scope.emptyDays){
                dayEntry.cycle = $scope.emptyDays;
                $scope.emptyDays = null;
              }
              $scope.feed.push(dayEntry);
            }
            else{
              buildEmptyCycle(dayEntry.label);
            }
             console.log("Dia " + day.toString("dd/MM") + " inserido no feed!");
             $scope.$emit('todo:listAdded');
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
    var offlineContent = {
      'qtd': 0,
      'photos': []
    }
    var offlinePromise = DBService.loadOfflinePhotos().then(
      function onFulfilled(result){
        //console.log("OfflinePromise fulfilled! " + JSON.stringify(result));
        if(result){
          offlineContent.qtd = result.length;
          for (var i = result.length - 1; i>=0; i--){
            //console.log(i + " -> " + JSON.stringify(result.item(i)));
            var image = result.item(i);
            var parsedDate = Date.parse(image.data);
            image['url'] = 'data:image/png;base64,' + image.base64;
            image['detail_url'] = "#";
            image['nome'] = image.title;
            image['data'] = parsedDate.toString("dd/MM - hh:mm");
            console.log("Offline Image = " + JSON.stringify(image).substring(0,50) + " title = " + image.nome);
            offlineContent.photos.push(image);
          }
          deferred.resolve(offlineContent);
        }
        else{
          deferred.resolve(false);
        }
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
    var photos = [];
    var dayAux = new Date(imagensData.stamp);
    if(imagensData && imagensData.length > 0){
      var imagePromises = []; //Array de promeças para cada imagem carregada no loop
      for (var i = imagensData.length - 1; i>=0; i--){
        console.log("DEBUG: Getting index " + i + " data...");
        //idImagem , nome, data, rating, descricao, ultimoComentario (idComentario, nomeUsuario, texto, dataEnvio)
        var json = FeedService.buildPhotoJson(imagensData[i]);
        console.log("DEBUG: Pre-json builded!");
        json["index"] = i;
        json["day"] = imagensData.stamp;
        var basePromise = FeedService.findPhotoBase(json).then(//precisa fazer uma promisse para carregar o base64 do SQLite
          function onFulfilled(json){
            //console.log("DEBUG: Achou a foto? Finally!!!  " + json["idImagem"]);
            //console.log("Imagem: " + JSON.stringify(json));
            json['url'] = 'data:image/png;base64,' + json.base64;
            photos.push(json);
          },
          function onRejected(reason){
            console.log("Algo deu errado...");
          }
        );
        imagePromises.push(basePromise); //adiciona no array de promeças, a promeça que eventualmente essa foto sera carregada.
        
      }//End -> for
      Q.all(imagePromises).then(function(){
        //console.log("DEBUG: Todas as promessas do feed foram cumpridas...");
        //Todas promessas foram compridas, então orderne o conjunto das fotos, e resolva a promessa referente ao dia:
        photos.sort(sort_by('timestamp', true, parseInt));
        deferred.resolve(photos);
      });

    }
    else{ //semana vazia, ou seja, sem feed algum
      //console.error("Semana vazia..." + day);
      deferred.resolve(null);
    } 
    return deferred.promise;

  }

  function sendAndUpdate(image, index){
    console.log("Image " + index + " -> " + image.title);
    $scope.offlinePhotos[index].synch = "Sincronizando...";
    ImagensServices.criaImagem(image.title, image.base64, image.ID).then(
      function onFulfilled(result){
        console.log("criaImagem Fulfilled = " + image.title)
        DBService.updatePhoto(image.ID, result).then(
          function onFulffilled(r){
            console.log("updatePhoto Fulfilled = " + image.title);
            $scope.offlinePhotos[index].synch = "Sucesso";
            $scope.qtd--;
            if($scope.qtd == 0){
              $scope.message = "Suas fotos foram sincronizadas com sucesso!"
              $scope.homebtn = true;
              $scope.$digest();
            }
          },
          function onError(reason){
            console.log("Erro: " + JSON.stringify(reason));
          }
        )
      },
      function onError(reason, status){
        console.log("Cria Imagem error");
        if(reason.msg == "Token invalido"){
          $scope.offlinePhotos[index].synch = "Erro de autenticação!";
          $scope.loginBtn = true;
        }
        else{
          $scope.offlinePhotos[index].synch = "Erro de conexão. Tente novamente.";
        }
        
        $scope.$digest();
      }
    );
  }

  $scope.sincronizar = function (){
    console.log("Sincronizar called!");
    if($cordovaNetwork.isOnline()){
      var qtd = $scope.offlinePhotos.length;
      console.log("QTD: " + qtd);
      for (var i= 0; i< qtd; i++){
        sendAndUpdate($scope.offlinePhotos[i], i);
      }
    }
  }

  $scope.camera = function(){
    $state.go('app.camera');
  }

  $scope.goLogin = function(){
    console.log("Mudando pargina para login!");
    $scope.loginBtn = false;
    $state.go('login');
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

  $scope.styles = {

  }

  $scope.commentable = true;

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
          var oneWeekAgo = new Date().last().week();
          if (Date.compare(date, oneWeekAgo) == -1 ){
            console.log("Foto muito antiga, desabilitar comentarios");
            $scope.commentable = false;
          }
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

          var error = "Falha ao logar, tente novamente.";
          //if (status == 401) {
          //  error = "Invalid Username or Password.";
          //}
          $scope.message = error;
          $scope.$digest();
        }

      );
  };

  /*$scope.$on('event:auth-loginRequired', function(e, rejection) {
    console.log('handling login required');
    $scope.loginModal.show();
  });*/  
})

.controller('RegisterCtrl', function($scope, $http,$ionicModal, $cordovaSQLite, $state, AuthenticationService, UserService, DBService) {
  $scope.message = "";
  
  $scope.user = {
    email: null,
    nome: null,
    senha: null,
    senha2: null
  };
 
  $scope.register = function() {
    if($scope.user.senha == $scope.user.senha2){
      AuthenticationService.register($scope.user).then(
        function onFulfilled(result){
          console.log("Usuario criado: " + JSON.stringify(result));
         $scope.user.senha = null;
         $scope.user.senha2 = null;
         $scope.message = "Usuário criado com sucesso, por favor faça o login."
         $scope.btnFlag = true;
         $scope.$digest();
        },
        function onRejected(reason, status){
          //do error handling
          var error = "Falha ao cadastrar, tente novamente.";
          $scope.message = error;
          $scope.$digest();
        }
      );
    }
    else{
      $scope.message = "As senhas diferem, por favor verifique e tente novamente."
    } 
  };

  /*$scope.$on('event:auth-loginRequired', function(e, rejection) {
    console.log('handling login required');
    $scope.loginModal.show();
  });*/  
})

.controller("PictureCtrl", function($scope,$state, $cordovaCamera, $cordovaSQLite, $cordovaNetwork, $cordovaDatePicker, DBService, ImagensServices, CameraService) {
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

    $scope.loadPicture = function() {

        

        var options = { 
            quality : 90, 
            destinationType : Camera.DestinationType.IMAGE_URI, 
            sourceType : Camera.PictureSourceType.PHOTOLIBRARY, 
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
 
        $cordovaCamera.getPicture(options).then(function(imageData) {
            //$scope.imgURI = "data:image/jpeg;base64," + imageData;
            /*CordovaExif.readData(imageData, function(exifObject) {
                console.log(exifObject);
            });*/
            //$scope.when = "true";
            var dateOptions = {
              date: new Date(),
              mode: 'time', // or 'time'
              maxDate: new Date(),
              allowOldDates: true,
              allowFutureDates: false,
              doneButtonLabel: 'DONE',
              doneButtonColor: '#F2F3F4',
              cancelButtonLabel: 'CANCEL',
              cancelButtonColor: '#000000'
            };

            //$cordovaDatePicker.show(dateOptions).then(function(date){
              //  $scope.date = date;
                //dateOptions.mode = 'time';
                //$cordovaDatePicker.show(dateOptions).then(function(hour){
                 // $scope.hour = hour;
                  $scope.imgURI = imageData;
                //});
            //});
            
        }, function(err) {
            // An error occured. Show a message to the user
        });
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
            console.log("Erro de getPicture...");
        });
    }

    function getBase64FromImageUrl(URL) {
      CameraService.encodeImageUri(URL, function(base64){
         var id = Date.now();
         var image = {
          'idImagem': id, 
          'nome': $scope.photoTitle, 
          'base64': base64,
          'day': Date.today().getTime(),
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
})

.controller('PerfilCtrl', function($scope, $state, $cordovaCamera, DBService, CameraService) {
  $scope.message = "";
  $scope.user = user;
  if(user.token_date){
    $scope.user.tokenExp = Date.parse(user.token_date).toString("dd/MM");
  }
  else{
    if(user.dataExpiracao){
      $scope.user.tokenExp = Date.parse(user.dataExpiracao).toString("dd/MM");
    }
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

    $scope.loadPicture = function() {
        var options = { 
            quality : 90, 
            destinationType : Camera.DestinationType.IMAGE_URI, 
            sourceType : Camera.PictureSourceType.PHOTOLIBRARY, 
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
})

.controller('SearchCtrl', function($scope, $rootScope, $state, FeedService, DBService) {
  $scope.input = {
    text: null,
    date: null
  };

  $scope.message = null;

  var searchPromise = Q.defer().promise;

  $scope.search = function() {
    //var photos = [];
    $scope.result = {
      'qtd' : null,
      'photos' : []
    };

    if($scope.input.text != null){
      //searchPromise = DBService.searchTextPhotos();
    }
    else{
      if($scope.input.date != null){
        var timestamp = Date.parse($scope.input.date);
        console.log("Timestamp de procura: " + timestamp.getTime());
        searchPromise = DBService.searchPhotoByDay(timestamp.getTime());
      }
    }
    searchPromise.then(
      function onFulfilled(result){
        console.log("Search fulfilled! ");
        if(result){
          console.log("Entrou no if...");
          console.log("length: " + result.length);
          $scope.result.qtd = result.length;
          for (var i = 0; i < result.length; i++){
            console.log(i + " -> " + result.item(i).title + " comment? : " + result.item(i).last_comment);
            var image = FeedService.buildPhotoJson(result.item(i));
            image['url'] = 'data:image/png;base64,' + image.base64;
            image['nome'] = image.title;
            $scope.result.photos.push(image);
            $scope.$digest();
          }
          
        }
        else{
           $scope.message = "Não foi encontrado nenhuma refeição nesse dia...";
           $scope.$digest();
        }
      },
      function onRejected(reason){
        console.log("A promessa da procura foi rejeitada por algum motivo...");
      }
    );
  }


})

