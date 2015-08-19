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
    var userInfo = JSON.parse(window.localStorage['user'] || '{}');
    console.log("userInfo = " + JSON.stringify(userInfo));
    $ionicLoading.hide();
    if (userInfo.hasOwnProperty('idUsuario')){
      user = userInfo;
      var today = Date.today();
      console.log("teste de tempo: " + Date.parse(user.dataExpiracao).getTime() + '>' + today.getTime());
    }
    else{
      console.log("Usuário Nulo ou Token Expirado");
      $state.go('login');
    }
    /*
    DBService.loadUser().then(function(userResult){
        console.log("User promise fulfilled!");
        $ionicLoading.hide();
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
    */
  });
 
  
})


.controller('PhotolistsCtrl', function($scope,$rootScope,$state, $ionicLoading, $cordovaNetwork, DBService, FeedService, ImagensServices) {
  var day = Date.today();
  var promiseList = [];
  var contador = 0;
  $scope.feed = [];
  $scope.offlinePhotos = [];
  $scope.scroll = false;
  $scope.qtd = 0;
  $scope.emptyDays = null;

  var emptySince = null;
  var userInfo = JSON.parse(window.localStorage['user'] || '{}');
  if (userInfo.hasOwnProperty('idUsuario')){
    user = userInfo;
    $scope.me = user.nomeUsuario;
    ConstructFeed();
  }

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
    if($scope.feed.length < 2 && contador < 31){
      console.log("feed muito pequeno, carregando mais dados...");
      contador += 1;
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
    if(networkType != type && $state.current.name=="app.photolists"){
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
      $scope.emptyDays = "Sem coletas do dia " + day + " até " + emptySince;
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
          var time = {hour:00, minute:01};
          var timeEnd = {hour:23, minute:59}
          ImagensServices.recuperaImagemData(Date.today().at(time), Date.today().at(timeEnd)).then(
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
      label: day.toString("dd/MM"),
      cycle: null 
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
              console.log("Dia " + day.toString("dd/MM") + "não vazio");
              dayEntry.photos = photos;
              if($scope.emptyDays){
                dayEntry.cycle = $scope.emptyDays;
                $scope.emptyDays = null;
              }
              $scope.feed.push(dayEntry);
              console.log("Dia " + day.toString("dd/MM") + " inserido no feed!");
            }
            else{
              buildEmptyCycle(dayEntry.label);
            }
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
            var parsedDate = new Date(image.timestamp);
            image['url'] = 'data:image/png;base64,' + image.base64;
            image['detail_url'] = "#";
            image['nome'] = image.title;
            image['data'] = parsedDate.toString("dd/MM - HH:mm");
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
        console.log("DEBUG: Getting index " + i + " data..." + JSON.stringify(imagensData[i]).substring(0,100));
        if(i == 0){
          console.log("TESTEEE ===> " + JSON.stringify(imagensData[i]));
        }
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
    ImagensServices.criaImagem(image.title, image.base64, image.timestamp).then(
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
          console.log("Comentario Salvo com Sucesso! " + new Date().toString("HH:mm"));
          $scope.commentField.text = "";
          var comment = {
            'dataEnvio' : "Agora às " + new Date().toString("HH:mm"),
            'nomeUsuario' : user.nomeUsuario,
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
          var oneWeekAgo = new Date().last().week().getTime();
          console.log("One Week Ago: " + oneWeekAgo + " Date time: " + result.timestamp);
          if (result.timestamp < oneWeekAgo){
            console.log("Foto muito antiga, desabilitar comentarios");
            $scope.commentable = false;
          }
          $scope.photo.stars = [];
          $scope.photo.starsEmpty = [];
          for(var j=1; j<= 5; j++){
            if(j <= result.rating) $scope.photo.stars.push(1);
            else $scope.photo.starsEmpty.push(1);
          }
          $scope.photo.day = new Date(result.timestamp).toString("dd/MM/yy");
          $scope.photo.hour = new Date(result.timestamp).toString("HH:mm");
          $scope.$digest();
        }
  )

  ImagensServices.recuperaComentarios($stateParams.id).then(
    function(comentarios){
      console.log("Comentarios: " + JSON.stringify(comentarios));
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
         window.localStorage['user'] = JSON.stringify(result);
         //DBService.insertUser(result).then(function(){
            console.log("Dados do usuário inseridos no banco de dados..." + JSON.stringify(result));
            $scope.$emit('todo:listChanged');
            $state.go('app.photolists');
         //});
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
    if($scope.user.senha != null && $scope.user.senha2 != null && $scope.user.nome != null && $scope.user.email != null){
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
        $scope.$digest();
      }
    }
    else{
      $scope.message = "Há campos vazios, por favor verifique se todos estão preenchidos e tente novamente."
      $scope.$digest();
    }
  };

  /*$scope.$on('event:auth-loginRequired', function(e, rejection) {
    console.log('handling login required');
    $scope.loginModal.show();
  });*/  
})

.controller('ForgotCtrl', function($scope, $http,$ionicModal, $cordovaSQLite, $state, AuthenticationService, UserService, DBService) {
  $scope.message = "";
  
  $scope.user = {
    currentPW: null,
    newPW: null,
    newPWC: null
  };
 
  $scope.sendMail = function() { 
  };

  $scope.resetPassword = function() { 
  };

  
})
.controller("PictureCtrl", function($scope,$state, $cordovaCamera, $cordovaSQLite, $cordovaNetwork, $cordovaDatePicker, DBService, ImagensServices, CameraService) {
    $scope.loadedPicture = false;
    $scope.selectedDay = null;
    $scope.selectedHour = null;
    $scope.checkedSave = false;
    var dia = null;
    var hora = null;
    var flag = true;

    $scope.selectDate = function(){
      console.log("Select date call!");
      var options = {
        date: new Date(),
        mode: 'date',
        maxDate: new Date()
      };

      function onSuccess(date) {
        //alert('Selected date: ' + date);
        dia = date;
        $scope.selectedDay = date.toString("dd/MM/yy");
        $scope.$digest();
      }

      function onError(error) { // Android only
        $scope.selectedDay = null;
        alert('Error: ' + error);
      }
      datePicker.show(options, onSuccess, onError);
    }

    $scope.selectHour = function(){
      console.log("Select date call!");
      var options = {
        date: new Date(),
        mode: 'time',
        is24Hour: true,
        minuteInterval: 5
      };

      function onSuccess(hour) {
        //alert('Selected date: ' + hour);
        hora = hour;
        $scope.selectedHour = hour.toString("HH:mm");
        $scope.$digest();
      }

      function onError(error) { // Android only
        $scope.selectedHour = null;
        alert('Error: ' + error);
      }
      datePicker.show(options, onSuccess, onError);
    }

    $scope.savePicture = function() {
      if(!$scope.photoTitle){
        $scope.blankTitle = true;
        $scope.savingPicture = false;
      }
      else{
        if(flag == true){
          $scope.blankTitle = false;
          $scope.savingPicture = true;
          flag = false;
          var imgURI = $scope.imgURI;
          //console.log("Img URI: " + imgURI);
          buildImageData(imgURI); 
        }
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
            targetWidth: 600,
            targetHeight: 600,
            //popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: $scope.checkedSave
        }; 
        
        $cordovaCamera.getPicture(options).then(function(imageData) {
            //$scope.imgURI = "data:image/jpeg;base64," + imageData;
            //$scope.when = "true";
            CordovaExif.readData(imageData, function(exifObject) {
              console.log("EXIF: " + exifObject);
            });
          $scope.imgURI = imageData;
          $scope.loadedPicture = true;
                
            
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }

    $scope.takePicture = function() {
        console.log("Salvar no album? " + $scope.checkedSave);
        var options = { 
            quality : 90, 
            destinationType : Camera.DestinationType.IMAGE_URI, 
            sourceType : Camera.PictureSourceType.CAMERA, 
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 600,
            targetHeight: 600,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: $scope.checkedSave
        };
 
        $cordovaCamera.getPicture(options).then(function(imageData) {
            //$scope.imgURI = "data:image/jpeg;base64," + imageData;
            $scope.loadedPicture = false;
            $scope.imgURI = imageData;
        }, function(err) {
            console.log("Erro de getPicture...");
        });
    }

    function addPhotoToDatabase(image, online){
      DBService.addPhoto(image, online).then(
        function onSuccess(){
            flag = true;
            online ? $scope.dbResult = "Imagem salva e sincronizada com sucesso!" : $scope.dbResult = "Imagem salva localmente com sucesso!";
            $scope.$digest();
            
        },
        function onError(){
            flag = true;
            $scope.dbResult = "Falha, tente novamente";
            $scope.$digest();
        }
      );
    }

    function buildImageData(URL) {
      //get the base64 from the image url/uri
      CameraService.encodeImageUri(URL, function(base64){
         var id = Date.now();
         var image = {
          'idImagem': id, 
          'nome': $scope.photoTitle, 
          'base64': base64,
          'timestamp': Date.now(),
          //'day': Date.today().getTime(),
          //'data': new Date().setTimeToNow(), 
          'rating': 0
         }
         //var timestamp = new Date().getTime();
         if($scope.loadedPicture == true){
            console.log("Foto foi carregada!" + $scope.selectedDay + " - " + $scope.selectedHour);
            var when = dia;
            dia.setHours(hora.getHours());
            dia.setMinutes(hora.getMinutes());
            console.log("Data final: " + dia);
            image.timestamp = dia.getTime();
            /*image.day = when.getTime();
            image.data = when;
            timestamp = when.getTime();*/
         }
         if($cordovaNetwork.isOnline()){
          ImagensServices.criaImagem(image.nome, image.base64, image.timestamp).then(
            function onSuccess(id){
              console.log("Imagem criada no servidor com id: " + id);
              image.idImagem = id;
              addPhotoToDatabase(image, 1);
            },
            function onError(err){
              console.log("Erro no AJAX de criar foto: " + JSON.stringify(err));
            }
          );
        }
        else{
          addPhotoToDatabase(image, 0);
        }
      });
    }
})

.controller('PerfilCtrl', function($scope, $state, $cordovaCamera, DBService, CameraService) {
  $scope.message = "";
  $scope.user = user;
  $scope.imgURI = null;
  $scope.perfilPhoto = null;

  

  console.log("Usuario: " + JSON.stringify(user));
  if(user.dataExpiracao){
    $scope.user.tokenExp = Date.parse(user.dataExpiracao).toString("dd/MM");
  }
  DBService.getPerfil(user.idUsuario).then(
    function onSucess(data){
      if(data.perfil != null){
        console.log("Perfil carregado: " + JSON.stringify(data.perfil));
        $scope.perfilPhoto = "data:image/jpeg;base64," + data.perfil;
        $scope.$digest();
      }

    }
        
  );

  $scope.savePicture = function(){
    var imgURI = $scope.imgURI;
    console.log("Img URI: " + imgURI);
    CameraService.encodeImageUri(imgURI, function(base64){ 
      //chama webservice
      //salva no banco de dados
      DBService.addPerfil(user.idUsuario, base64).then(
        function onSucess(){
          $scope.perfilPhoto = "data:image/jpeg;base64," + base64;
          $scope.imgURI = null;
          $scope.photoSaved = true;
          $scope.$digest();
          console.log("Perfil salvo no banco de dados com sucesso.");
        } 
      );
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

.controller("NotificationCtrl", function($scope, $cordovaLocalNotification) {
 
    $scope.add = function() {
        var alarmTime = new Date();
        alarmTime.setMinutes(alarmTime.getMinutes() + 1);
        $cordovaLocalNotification.add({
            id: "1234",
            date: alarmTime,
            message: "This is a message",
            title: "This is a title",
            autoCancel: true,
            sound: null
        }).then(function () {
            console.log("The notification has been set");
        });
    };
 
    $scope.isScheduled = function() {
        $cordovaLocalNotification.isScheduled("1234").then(function(isScheduled) {
            alert("Notification 1234 Scheduled: " + isScheduled);
        });
    }

    $scope.$on("$cordovaLocalNotification:added", function(id, state, json) {
      alert("Added a notification");
    });
 
});

