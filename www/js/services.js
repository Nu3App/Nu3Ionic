var urlService = "http://200.144.93.244/nutri-rest-patient/rest/";
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

.factory("transformRequestAsFormPost",
    function() {

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
  return {
    login: function(user) {
      var deferred = Q.defer();
      var url = urlService + "auth/loginUsuario";
      $http.post(url, user,{transformRequest: transformRequestAsFormPost})
      .success(function (data) {
      	//data.nomeUsuario, mail, data.token, data.dataExpiracao
    	//$http.defaults.headers.common.Authorization = data.token;  // Step 1
        console.log("Usuário Logado DATA: " + JSON.stringify(data));
        deferred.resolve(data);
      })
      .error(function (data, status) {
        console.log("Erro: " + JSON.stringify(data) + " Status: " + status);
        deferred.reject(data, status);
      });
      return deferred.promise;
    },
    logout: function(user) {
      $http.post('https://logout', {}, { ignoreAuthModule: true })
      .finally(function(data) {
        //localStorageService.remove('authorizationToken');
        delete $http.defaults.headers.common.Authorization;
        $rootScope.$broadcast('event:auth-logout-complete');
      });			
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

  self.init =function(){
      
      try{    
        self.db = $cordovaSQLite.openDB("my.db"); 
        $cordovaSQLite.execute(self.db, "CREATE TABLE IF NOT EXISTS users (ID TEXT PRIMARY KEY, username TEXT, email TEXT, token TEXT, token_date DATETIME)");
        $cordovaSQLite.execute(self.db, "CREATE TABLE IF NOT EXISTS photos (ID TEXT PRIMARY KEY, title TEXT, base64 TEXT, data TEXT, rating INTEGER, synchronized INTEGER)");
        def.resolve(true);
      }catch(e){
        def.reject(e);
      }
  }

  self.status = function(){
    return def.promise;
  }

  self.insertUser = function(userEntry) {
    var deferred = Q.defer();
    //pensar em um jeito de deixar uma tabela single row, talvez com um index fixo...
    var query = "INSERT OR REPLACE INTO users (ID, username, email, token, token_date) VALUES (?,?,?,?,?)"; //ID TEXT PRIMARY KEY, username TEXT, email TEXT, token TEXT, token_date DATETIME
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
        } else {
            console.log("No results found");
            deferred.resolve(null);
        }
    }, function (err) {
        console.error(JSON.stringify(err));
    });    
    return deferred.promise;
  }

  return self;
  
})
