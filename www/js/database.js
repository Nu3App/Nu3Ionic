
var db = null;

.factory('DBService', function($rootScope, $cordovaSQLite) {
	return {
		openDb : function() {
	   		db = $cordovaSQLite.openDB("my.db");
		},
		createTable : function() {
			$cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS users (ID INTEGER PRIMARY KEY, userId TEXT, username TEXT, email TEXT, token TEXT, token_date DATETIME)");
		    $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS photos (ID TEXT PRIMARY KEY, title TEXT, base64 TEXT, data TEXT, rating INTEGER, synchronized INTEGER)");	
		}
		insertUser : function(userEntry) {
			var db = app.db;
		    var deferred = Q.defer();
		    var query = "INSERT INTO users (ID, userId, username, email, token, token_date) VALUES (?,?,?,?,?)"; //ID TEXT PRIMARY KEY, username TEXT, email TEXT, token TEXT, token_date DATETIME
		    $cordovaSQLite.execute(db, query, [0, userEntry.idUsuario, userEntry.nomeUsuario, userEntry.email, userEntry.token, userEntry.dataExpiracao]).then(function(res) {
		        console.log("INSERT ID -> " + res.insertId);
		        deferred.resolve(info);
		    }, function (err) {
		        console.error(err);
		        deferred.reject(err);
		    });
		    return deferred.promise;
		 }
		loadUser : function(){
			var db = app.db;
			var deferred = Q.defer();
		    var query = "SELECT * FROM user WHERE ID = 0";
		    $cordovaSQLite.execute(db, query).then(function(res) {
		        if(res.rows.length > 0) {
		            console.log("SELECTED -> " + res.rows.item(0).username + " " + res.rows.item(0).token);
		            user = res.rows.item(0);
		            $rootScope.token = user.token;
		            deferred.resolve(user);
		        } else {
		            console.log("No results found");
		            $rootScope.token = null;
		            deferred.resolve(null);
		        }
		    }, function (err) {
		        console.error(err);
		    });    
			return deferred.promise;
		}
})
/*
app.removeUser = function(){
	var db = app.db;
	db.transaction(function(transaction) {
	   transaction.executeSql('DELETE FROM users WHERE id=1', [],
	     function(transaction, result) {
	     	console.log("Succecc: " + result.message); 
	     },app.onError);
	 },app.onError);
}

app.addPhoto = function(json, base64, mode) {
	//mode defina se a foto está sendo adicionada no modo online ou offline
	console.log("DB: Adding photo with id " + json.idImagem);
	var db = app.db;
	var deferred = Q.defer();
	db.transaction(function(tx) { //ID TEXT PRIMARY KEY, title TEXT, base64 TEXT, data DATETIME, rating INTEGER, added_on DATETIME, stars INTEGER, starsEmpty INTEGER
		tx.executeSql("INSERT INTO photos(ID, title, base64, data, rating, synchronized) VALUES (?,?,?,?,?,?)",
					  [json.idImagem, json.nome, base64, json.data, json.rating, mode],
					  function success(tx, r){
					  		console.log("Photo Succecc: " + JSON.stringify(r));
					  		deferred.resolve(base64);
					  },
					  app.onError);
	});
	return deferred.promise;
}

app.loadPhoto = function(id){
	console.log("DB: Searching for photo with id " + id);
	var db = app.db;
	var deferred = Q.defer();
	db.transaction(
		function(tx){
			tx.executeSql(
				"SELECT * FROM photos WHERE ID=?", 
				[id], 
				function(tx, result){
					
					var len = result.rows.length;
					//console.log("DB: found photo " + id + "   row lenght: " + len);
					if(len>0){
						var row = result.rows.item(0);
						console.log("DB: Photo with id " + id + " loaded.");
						//console.log("ROW: " + JSON.stringify(row));
						//deferred.resolve(result.rows.item(0)['base64']);
						deferred.resolve(row);
					}
					else{
						deferred.resolve(null);
					}
				},
				function(tx, error){
					console.log("DB PHOTO ERROR: " + error.message);
					deferred.reject(json);
				}
			);
		}, 
		function onError(tx, error){
			console.log("DB load photo error: " + error.message);
			deferred.reject(json);
		}
	);
	return deferred.promise;
}

app.loadOfflineLib = function(){
	console.log("DB: Searching for photos not synchronized");
	var db = app.db;
	var deferred = Q.defer();
	db.transaction(
		function(tx){
			tx.executeSql(
				"SELECT * FROM photos WHERE synchronized=0", 
				[], 
				function(tx, result){
					
					var len = result.rows.length;
					//console.log("DB: found photo " + id + "   row lenght: " + len);
					if(len>0){
						deferred.resolve(result.rows);
					}
					else{
						deferred.resolve(null);
					}
				},
				function(tx, error){
					console.log("DB PHOTO ERROR: " + error.message);
					deferred.reject(json);
				}
			);
		}, 
		function onError(tx, error){
			console.log("DB load photo error: " + error.message);
			deferred.reject(json);
		}
	);
	return deferred.promise;
}

app.updateRating = function(id, rating){
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("UPDATE photos SET rating= ? WHERE ID = ?",
					  [id, rating],
					  app.onSuccess,
					  app.onError);
	});

}

app.updateSynch = function(id, data){
	var db = app.db;
	var deferred = Q.defer();
	db.transaction(function(tx) {
		tx.executeSql("UPDATE photos SET id= ?, synchronized = 1 WHERE ID = ?",
					  [data.idImagem, id],
					  function success(result){
					  	console.log("Photo id successfully edited");
					  	deferred.resolve();
					  },
					  app.onError);
	});
	return deferred.promise
}
      
app.onError = function(tx, e) {
	console.log("Error: " + e.message);
} 
      
app.onSuccess = function(tx, r) {
	console.log("Succecc: " + JSON.stringify(r));
	//app.refresh();
}
      
app.deleteTodo = function(id) {
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("DELETE FROM todo WHERE ID=?", [id],
					  app.onSuccess,
					  app.onError);
	});
}

app.refresh = function() {
	var renderTodo = function (row) {
		return "<li>" + "<div class='todo-check'></div>" + row.todo + "<a class='button delete' href='javascript:void(0);'  onclick='app.deleteTodo(" + row.ID + ");'><p class='todo-delete'></p></a>" + "<div class='clear'></div>" + "</li>";
	}
    
	var render = function (tx, rs) {
		var rowOutput = "";
		var todoItems = document.getElementById("todoItems");
		for (var i = 0; i < rs.rows.length; i++) {
			rowOutput += renderTodo(rs.rows.item(i));
		}
      
		todoItems.innerHTML = rowOutput;
	}
    
	var db = app.db;
	db.transaction(function(tx) {
		tx.executeSql("SELECT * FROM todo", [], 
					  render, 
					  app.onError);
	});
}
*/