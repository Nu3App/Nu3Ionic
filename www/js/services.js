var urlService = "http://nu3.unifesp.br/nutri-rest-patient/rest/"
//"http://200.144.93.244/nutri-rest-patient/rest/";
//login: "auth/loginUsuario"
//cadastro: 

angular.module('nu3.services', [])
.service('UserService', function($rootScope, $ionicModal, $timeout) {
  var init = function($scope) {
    // Form data for the login modal
    $scope = $scope || $rootScope.$new();
    //$scope.loginData = {};
    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope,
      animation: 'slide-in-up',
      focusFirstInput: false
    }).then(function(modal) {
      $scope.modal = modal;
    });
    // Triggered in the login modal to close it
    $scope.closeLogin = function() {
      $scope.modal.hide();
    };
    // Open the login modal
    $scope.openLogin = function() {
      $scope.modal.show();
    };
  }
  return {
    init: init
  }
})

.factory("transformRequestAsFormPost",function() {

        // I prepare the request data for the form post.
        function transformRequest( data, getHeaders ) {

            var headers = getHeaders();

            //headers[ "Content-type" ] = "application/x-www-form-urlencoded; charset=utf-8";

            return( serializeData( data ) );

        }
        // Return the factory value.
        return( transformRequest );
        // ---
        // PRVIATE METHODS.
        // ---
        // I serialize the given Object into a key-value pair string. This
        // method expects an object and will default to the toString() method.
        // --
        // NOTE: This is an atered version of the jQuery.param() method which
        // will serialize a data collection for Form posting.
        // --
        // https://github.com/jquery/jquery/blob/master/src/serialize.js#L45
        function serializeData( data ) {

            // If this is not an object, defer to native stringification.
            if ( ! angular.isObject( data ) ) {

                return( ( data == null ) ? "" : data.toString() );

            }

            var buffer = [];

            // Serialize each key in the object.
            for ( var name in data ) {

                if ( ! data.hasOwnProperty( name ) ) {

                    continue;

                }

                var value = data[ name ];

                buffer.push(
                    encodeURIComponent( name ) +
                    "=" +
                    encodeURIComponent( ( value == null ) ? "" : value )
                );

            }

            // Serialize the buffer and clean it up for transportation.
            var source = buffer
                .join( "&" )
                .replace( /%20/g, "+" )
            ;

            return( source );

        }

    }
)
.factory('AuthenticationService', function($rootScope, $http, transformRequestAsFormPost) {
  $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
  function AJAXservice(url, dataE, string){
    var deferred = Q.defer();
    $http.post(url, dataE,{transformRequest: transformRequestAsFormPost})
      .success(function (data) {
        console.log(string + JSON.stringify(data));
        if(url == urlService + "image/obtemResumoImagens"){
          console.log("Recuperando image/obtemResumoImagens " + dataE.millisDataInicio);
          data.stamp = dataE.millisDataInicio;
        }
        deferred.resolve(data);
      })
      .error(function (data, status) {
        console.log("Erro: " + JSON.stringify(data) + " Status: " + status);
        deferred.reject(data, status);
      });
    return deferred.promise
  }
  return {
    login: function(user) {
      user.email = user.email.trim().toLowerCase();
      var url = urlService + "auth/loginUsuario";
      return AJAXservice(url, user, "Login Data: ");
    },
    logout: function(user) {
      $http.post('https://logout', {}, { ignoreAuthModule: true })
      .finally(function(data) {
        //localStorageService.remove('authorizationToken');
        delete $http.defaults.headers.common.Authorization;
        $rootScope.$broadcast('event:auth-logout-complete');
      });			
    },
    register: function(user){
      user.email = user.email.trim().toLowerCase();
      var dataE = {"email" : user.email, "senha" : user.senha, "nome" : user.nome};
      var url = urlService + "auth/criaUsuario";
      return AJAXservice(url, dataE, "Login Data: ");
    },	
    loginCancelled: function() {
      authService.loginCancelled();
    }
  };
})

.service('DBService', function($cordovaSQLite) {
  var self = this;
  self.db = null;
  var def = Q.defer();
  var userDefer = Q.defer();

  self.init =function(){
      
      try{    
        self.db = $cordovaSQLite.openDB("my.db"); 
        $cordovaSQLite.execute(self.db, "CREATE TABLE IF NOT EXISTS users (ID TEXT PRIMARY KEY, nomeUsuario TEXT, email TEXT, token TEXT, token_date DATETIME)");
        $cordovaSQLite.execute(self.db, "CREATE TABLE IF NOT EXISTS perfils (ID TEXT PRIMARY KEY, perfil TEXT)");
        $cordovaSQLite.execute(self.db, "CREATE TABLE IF NOT EXISTS photos (ID TEXT PRIMARY KEY, title TEXT, base64 TEXT, data TEXT, day_timestamp INTEGER, last_comment TEXT, last_comment_id TEXT, rating INTEGER, synchronized INTEGER)");
        def.resolve(true);
      }catch(e){
        def.reject(e);
      }
  }

  self.getUser = function(){
    return userDefer.promise;
  }

  self.status = function(){
    return def.promise;
  }

  self.addPerfil = function(id, perfil){
    var deferred = Q.defer();
    console.log("DB: Inserting perfil of user id: " + id);
    //pensar em um jeito de deixar uma tabela single row, talvez com um index fixo...
    var query = "INSERT OR REPLACE INTO perfils (ID,perfil) VALUES (?,?)"; //ID TEXT PRIMARY KEY, username TEXT, email TEXT, token TEXT, token_date DATETIME
    $cordovaSQLite.execute(self.db, query, [id, perfil]).then(function(res) {
        console.log("INSERT ID -> " + res.insertId);
        deferred.resolve(res);
    }, function (err) {
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });
    return deferred.promise;
  }

  self.getPerfil = function(id){
    var deferred = Q.defer();
    console.log("DB: loading perfil from user: " + id);
    var query = "SELECT perfil FROM perfils WHERE ID = ?";
    $cordovaSQLite.execute(self.db, query, [id]).then(function(res) {
      deferred.resolve(res.rows.item(0));
    }, function (err) {
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });
    return deferred.promise;
  }

  self.insertUser = function(userEntry) {
    var deferred = Q.defer();
    //pensar em um jeito de deixar uma tabela single row, talvez com um index fixo...
    var query = "INSERT OR REPLACE INTO users (ID, nomeUsuario, email, token, token_date) VALUES (?,?,?,?,?)"; //ID TEXT PRIMARY KEY, username TEXT, email TEXT, token TEXT, token_date DATETIME
    $cordovaSQLite.execute(self.db, query, [userEntry.idUsuario, userEntry.nomeUsuario, userEntry.email, userEntry.token, userEntry.dataExpiracao]).then(function(res) {
        console.log("INSERT ID -> " + res.insertId);
        deferred.resolve(res);
    }, function (err) {
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });
    return deferred.promise;
  }, 

 self.loadUser = function(){
    var deferred = Q.defer();
    var query = "SELECT * FROM users";
    $cordovaSQLite.execute(self.db, query).then(function(res) {
        if(res.rows.length > 0) {

            console.log("lenght = " + res.rows.length + " SELECTED -> " + JSON.stringify(res.rows.item(0)));
            deferred.resolve(res.rows.item(0));
            userDefer.resolve(res.rows.item(0));
        } else {
            console.log("No results found");
            deferred.resolve(null);
        }
    }, function (err) {
        console.error(JSON.stringify(err));
    });    
    return deferred.promise;
  }

  self.loadOfflinePhotos = function(){
    var deferred = Q.defer();
    var query = "SELECT * FROM photos WHERE synchronized=0";
    $cordovaSQLite.execute(self.db, query).then(function(res) {
        var len = res.rows.length;
          //console.log("DB: found photo " + id + "   row lenght: " + len);
          if(len>0){
            console.log("DB: Photos offline loaded.");
            //console.log("ROW: " + JSON.stringify(row));
            //deferred.resolve(result.rows.item(0)['base64']);
            deferred.resolve(res.rows);
          }
          else{
            deferred.resolve(null);
          }
    }, function (err) {
        console.error("Photos Offline: ERRO ao carragar do banco de dados!!!");
        console.error(JSON.stringify(err));
    });    
    return deferred.promise;
  },

  self.loadPhoto = function(idImagem){
    var deferred = Q.defer();
    var query = "SELECT * FROM photos WHERE ID=?";
    $cordovaSQLite.execute(self.db, query, [idImagem]).then(function(res) {
        var len = res.rows.length;
          //console.log("DB: found photo " + id + "   row lenght: " + len);
          if(len>0){
            var row = res.rows.item(0);
            //console.log("DB: Photo with id " + idImagem + " loaded.");
            //console.log("ROW: " + JSON.stringify(row));
            //deferred.resolve(result.rows.item(0)['base64']);
            deferred.resolve(row);
          }
          else{
            deferred.resolve(null);
          }
    }, function (err) {
        console.error("Photo " + json.idImagem + " ERRO ao carragar do banco de dados!!!");
        console.error(JSON.stringify(err));
    });    
    return deferred.promise;
  },

  self.searchPhotoByDay = function(timestamp){
    var deferred = Q.defer();
    var query = "SELECT * FROM photos WHERE day_timestamp=?";
    $cordovaSQLite.execute(self.db, query, [timestamp]).then(function(res) {
        var len = res.rows.length;
          console.log("DB: resulted " + len + " from day " + timestamp + "!");
          if(len>0){
            //console.log("DB: Photo with id " + idImagem + " loaded.");
            //console.log("ROW: " + JSON.stringify(row));
            //deferred.resolve(result.rows.item(0)['base64']);
            deferred.resolve(res.rows);
          }
          else{
            deferred.resolve(null);
          }
    }, function (err) {
        console.error("Photo " + json.idImagem + " ERRO ao carragar do banco de dados!!!");
        console.error(JSON.stringify(err));
    });    
    return deferred.promise;
  },

  self.updatePhoto = function(idImagem, novaID){
    var deferred = Q.defer();
    console.log("DB -> Updating photo infos from " + idImagem + " to " + novaID);
    var query = "UPDATE photos SET ID= ?, synchronized = 1 WHERE ID = ?";
    $cordovaSQLite.execute(self.db, query, [novaID, idImagem]).then(function(res) {
        console.log("DB Photo Update com sucesso");
        deferred.resolve(true);
         
    }, function (err) {
        console.log("Update Image Error!!!");
        console.log(JSON.stringify(err));
        deferred.reject(err);
    });    
    return deferred.promise;
  },

  self.addPhoto = function(json, base64, mode){
    console.log("DB: Adding photo with id " + json.idImagem + " do dia: " + json.day);
    var deferred = Q.defer();
    var query = "INSERT INTO photos(ID, title, base64, data, day_timestamp, rating, synchronized) VALUES (?,?,?,?,?,?,?)";
    $cordovaSQLite.execute(self.db, query, [json.idImagem, json.nome, base64, json.data, json.day, json.rating, mode]).then(function(res) {
        //console.log("Photo " + json.idImagem + " adicionado no banco de dados com sucesso!");
        deferred.resolve(true);
    }, function (err) {
        console.error("Photo " + json.idImagem + " ERRO ao adicionar no banco de dados!!!");
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });    
    return deferred.promise;
  },

  self.updateRating = function(id, rating){
    var deferred = Q.defer();
    var query = "UPDATE photos SET rating= ? WHERE ID = ?";
    $cordovaSQLite.execute(self.db, query, [rating, id]).then(function(res) {
        console.log("Atualizado rating da foto " + id);
        deferred.resolve(true);
    }, function (err) {
        console.error("Falha ao atualizar ratinda da imagem " + id);
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });    
    return deferred.promise;
  },

  self.updateComment = function(id, comment){
    var deferred = Q.defer();
    console.log("Updating Comment ( "+ comment.texto + ") from photo " + id);
    var query = "UPDATE photos SET last_comment = ?, last_comment_id = ? WHERE ID = ?";
    $cordovaSQLite.execute(self.db, query, [comment.texto, comment.idComentario, id]).then(function(res) {
        console.log("Atualizado comment da foto " + id);
        deferred.resolve(true);
    }, function (err) {
        console.error("Falha ao atualizar ratinda da imagem " + id);
        console.error(JSON.stringify(err));
        deferred.reject(err);
    });    
    return deferred.promise;
  }

  return self;
  
})

.factory('ImagensServices', function($rootScope, $http, transformRequestAsFormPost) {
  $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
  function AJAXservice(url, dataE, string){
    var deferred = Q.defer();
    $http.post(url, dataE,{transformRequest: transformRequestAsFormPost})
      .success(function (data) {
        //console.log(string + JSON.stringify(data));
        if(url == urlService + "image/obtemResumoImagens"){
          //console.log("Recuperando image/obtemResumoImagens " + dataE.millisDataInicio);
          data.stamp = dataE.millisDataInicio;
        }
        deferred.resolve(data);
      })
      .error(function (data, status) {
        console.log("Erro: " + JSON.stringify(data) + " Status: " + status);
        deferred.reject(data, status);
      });
    return deferred.promise
  }
  function AJAXtextService(url, dataE, string){
    var deferred = Q.defer();
    $http.post(url, dataE,{transformRequest: transformRequestAsFormPost, headers: {'Accept': "text"}})
      .success(function (data) {
        //console.log(string + JSON.stringify(data).substr(0,30));
        deferred.resolve(data);
      })
      .error(function (data, status) {
        console.log("Erro: " + JSON.stringify(data) + " Status: " + status);
        deferred.reject(data, status);
      });
    return deferred.promise
  }

  return {
    recuperaImagemData: function(dataInicio, dataFim){
      //console.log("Recupera Imagem Data de " + dataInicio + " até " + dataFim );
      var dataE = {"token" : user.token, "millisDataInicio" : dataInicio.getTime(), "millisDataFim" : dataFim.getTime()};
      var url = urlService + "image/obtemResumoImagens";
      return AJAXservice(url, dataE, "Recupera Imagem Data: ");

    },
    recuperaImagem: function(imagemID, token){
      var dataE = {"token" : user.token, "idImagem" : imagemID};
      //console.log("Recupera Imagem Data: " + JSON.stringify(dataE));
      var url = urlService + "image/obtemImagem";
      //return AJAXservice(url, dataE, "Recupera Imagem: ");
      return AJAXtextService(url, dataE, "Obtem Imagem: ");
    },
    recuperaComentarios: function(imagemID){
      var dataE = {"token" : user.token, "idImagem" : imagemID};
      var url = urlService + "comment/obtemComentarios";
      return AJAXservice(url, dataE, "Recupera Comentarios: ");
    },
    criaComentario: function(imagemID, comentario){
      var dataE = {"token" : user.token, "idImagem" : imagemID, "comentarioText" : comentario };
      var url = urlService + "comment/criaComentario";
      return AJAXservice(url, dataE, "Cria Comentario: ");
    },
    criaImagem: function(title, base64, timestamp){
      var url = urlService + "image/criaImagem";
      var dataE = {"token" : user.token, "nomeFoto" : title , "descricao" : timestamp , "base64code" : base64};
      return AJAXtextService(url, dataE, "Cria Foto: ");
    }
  }
})

.service('FeedService', function($rootScope, DBService, ImagensServices) {
 
  return {

    buildPhotoJson : function(json){
        json["stars"] = [];
        json["starsEmpty"] = [];
        for(var j=1; j<= 5; j++){
          if(j <= json.rating) json["stars"].push(1);
          else json["starsEmpty"].push(1);
        }
        var parsedDate = Date.parse(json.data);
        if(json.idImagem){
          console.log("Building photo with idImagem: " + json.idImagem);
          json['detail_url'] = "#/app/photolists/" + json["idImagem"];
        }
        else{
          //console.log("Building photo with ID: " + json["ID"]);
          json['detail_url'] = "#/app/photolists/" + json["ID"];
        }
        json['timestamp'] = parsedDate.getTime();
        json['hour'] = parsedDate.toString("hh:mm");
        return json;
    },

   findPhotoBase : function(json){
      var deferred = Q.defer();
      var base64Promise = DBService.loadPhoto(json.idImagem);
      base64Promise.then(
        function onFulfilled(result){
            if (result != null){
              json["base64"] = result["base64"];
              if(json["rating"] != result["rating"]){
                console.log("Atualizando rating da foto");
                DBService.updateRating(json.idImagem, json.rating);
              }
              
              if(json.ultimoComentario){
                console.log("Ultimo comentario info: " + JSON.stringify(json.ultimoComentario));
                if(json["ultimoComentario"].idComentario != result["last_comment_id"]){
                  console.log("Novo comentario!");
                  json["newComment"] = true;
                  DBService.updateComment(json.idImagem, json.ultimoComentario);
                }
              }
              
              //console.log("Base64 já existente no banco de dados");
              deferred.resolve(json);
            }
            else{
              //console.log("Base64 não presente no banco de dados");
            //pede para o webservice a base64 e então adiciona no banco de dados
              ImagensServices.recuperaImagem(json.idImagem, user.token).then(
                function (base){
                  if (base != null){
                    //console.log("Teste base: " + base.slice(0,10) + ".....");
                    json["base64"] = base;
                    DBService.addPhoto(json, base, 1).then(
                      function(){
                        console.log("Base da imagem" + json.idImagem + "adicionada no banco de dados...");
                        DBService.updateComment(json.idImagem, json.ultimoComentario);
                      }
                    );
                    deferred.resolve(json);
                  }
                  else{
                    context = {
                      "error" : "Erro de conexão",
                      "link" : "#login",
                      "btn-text": "Login",
                      "msg" : "Verifique se seu dispositivo está conectado à internet, e tente entrar novamente. Se o problema persistir, aguarde que nossos servidores retornarão em breve.",
                      "offline" : true
                    }
                    deferred.reject();
                    //changeToErrorPage(context);
                  }

                }
              );
            }
        },
        function onRejected(reason){
          console.log("Rejected...");
          context = {
            "error" : "Erro de conexão",
            "link" : "#login",
            "btn-text": "Login",
            "msg" : "Verifique se seu dispositivo está conectado à internet, e tente entrar novamente. Se o problema persistir, aguarde que nossos servidores retornarão em breve.",
            "offline" : true
          }
          //changeToErrorPage(context);
        }
      );
      return deferred.promise;
    }
  }
})

.service('DetailsService', function($scopeParams, DBService) {
  return {
    getDetail: function(id) {
      console.log("Procurando detalhes de : " + id);
      var deferred = Q.defer()
      DBService.loadPhoto(photoID).then(
      function(result){
          console.log("Dados carregados do banco de dados");
          deferred.resolve(result);
        }
      )
      return deferred.promise
    }

  }
})

.service('CameraService', function($rootScope) {
  return {
    encodeImageUri: function(imageUri, callback) {
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

  }
})