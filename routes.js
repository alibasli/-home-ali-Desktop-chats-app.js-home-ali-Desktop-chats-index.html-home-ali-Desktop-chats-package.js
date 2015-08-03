
var should = require("should");
var monk = require("monk"); 

var db = monk('localhost/Chat');
should.exists(db);

var collectionmessages= db.get("messages");
should.exists(collectionmessages);
var collectionrooms = db.get("rooms");
should.exists(collectionmessages);
var collectionusers = db.get("users");
should.exists(collectionmessages);

// usernames which are currently connected to the chat
var usernames = {};
usernames['Genel'] = 'Genel';
// rooms which are currently available in chat
var allusernames = {};
//allusernames['Genel'] = 'Genel';

var allAndroidUsers=[{'user':'Genel','username':'Genel','usersurname':'','online':'2'}];

getAllUsers();

//-----------socket------------------

module.exports = function(io){	
io.sockets.on('connection', function (socket) {
	
	socket.on('adduser', function(username){
		socket.username = username;
		socket.room = 'Genel';
		usernames[username] = username;
		var Email = username + "@gmail.com";
		io.emit('login', username,Email,socket.room);		
		socket.join('Genel');		
		addUser(username,io);	
		findUserMessages(username,socket);		
		getOldMessage(socket,'Genel');
	});
	socket.on('create account', function(Email,username,name,surname,password){		
		addNewUser(Email,username,name,surname,password,socket);
		
		console.log(Email,username,name,surname,password);		
	});
	socket.on('logining', function(username,password){		
		loginControl(username,password,socket)
		
		console.log(username + 'is trying to login');
	});
	socket.on('user logined', function(username){		
		userLogined(username,socket);		
	});	
	socket.on('user list', function(){			
		for(var i=0;i<allAndroidUsers.length;i++) {
			if(allAndroidUsers[i]['user'] != socket.username) {
				socket.emit('userList', allAndroidUsers[i]['username'] +" " + allAndroidUsers[i]['usersurname'] , allAndroidUsers[i]['online']);			
				console.log( allAndroidUsers[i]['username'] +" " + allAndroidUsers[i]['usersurname']  , allAndroidUsers[i]['online']);
			}
		}	
		//socket.emit('userList', 'finish' , 'finish' );
		//console.log("finish");	
	});
	socket.on('message list', function(){			
		findPersonelMessages(socket.username , socket);		
	});
	socket.on('search friends', function(data){			
		searchFriends(data , socket);		
	});
	socket.on('switchRoom', function(user){
		//console.log(user);
		socket.leave(socket.room);
		//io.emit('updateusers', allusernames,usernames);
		if(user != 'Genel '){
			for(var i=0;i<allAndroidUsers.length;i++) {
				if(allAndroidUsers[i]['username'] +" " + allAndroidUsers[i]['usersurname'] == user) {
					findRoom(socket.username,allAndroidUsers[i]['user'],socket);
					break;
				}
			}						
		}
		else{
			socket.join(user);
			socket.room = user;	
			
			getOldMessage(socket,user);
		}		
	});		
	socket.on('sendchat', function (user1,user2,data) {
		io.sockets.in(socket.room).emit('new message', user1, data);
		for(var i=0;i<allAndroidUsers.length;i++) {
				if(allAndroidUsers[i]['username'] +" " + allAndroidUsers[i]['usersurname'] == user2) {
					setMessage(socket.room , socket.username , allAndroidUsers[i]['user'] , user1 , data);
					break;
				}
		}
		
	});	
	socket.on('disconnect', function(){
		console.log(socket.username);
		
		delete usernames[socket.username];		
		//io.emit('updateusers', allusernames,usernames);		
		socket.leave(socket.room);
	});
});
}

//-----------Socket---End---------------


//-------------db----------

function findRoom(user1,user2,socket){
	collectionrooms.find({ $or : [
		{ $and : [ { 'user1' : user1 } , { 'user2' : user2 } ] },
		{ $and : [ { 'user1' : user2 } , { 'user2' : user1 } ] }
		]}, 		
		{},function(err, rows){
        if (err)
            console.log(err);
        else{
				try {
					
					if(rows.length>=1){
						socket.join(rows[0].room);
						socket.room = rows[0].room;
		
						getOldMessage(socket,rows[0].room);
					}
					else{
						creatRoom(user1,user2,socket);
					}
				}
				catch(err) {
					console.log("findRoom sorgusu hatali");
				}
			}			
    }); 
}
function creatRoom(user1,user2,socket){
	collectionrooms.insert({'room':user1+user2,'user1':user1,'user2':user2}, function(err, doc){
	    	if(err)	{console.log("HATA");}
	    	else{
				socket.join(user1+user2);
				socket.room = user1+user2;
	
			}
	    });
}
function getRooms(){
	collectionrooms.find({'room' : room}, { limit : 100 },function(err, rows){
        if (err){
            console.log(err);}
        else{
			for (var i = 0; i < rows.length; i++) {
				try {
					rooms.push(rows[i].room);
				}
				catch(err) {
					console.log(" hatali sorgu getRooms");
				}
			}
			
		}
    }); 
}
function setMessage(room,user1,user2,usernameandsurname,message) {	
	collectionmessages.insert({'room':room,'user1':user1,'user2':user2,'usernameandsurname':usernameandsurname,'message':message}, function(err, doc){
	    	if(err)	{console.log("HATA");}
	    });
}

function findUserMessages(user,socket) {
var messagesPeople=[{'user':'Genel'}];
collectionrooms.find({ $or : [ {  'user1' : user  },{  'user2' : user  } ] }, {},function(err, rows){
        if (err)
            console.log(err);
        else{
				try {		
					for (var i = 0; i < rows.length; i++) {	
						if(rows[i].user1 == user){	
							messagesPeople.push({'user':rows[i].user2});
						}
						else{					
							messagesPeople.push({'user':rows[i].user1});
						}
					}
					socket.emit('updateallmessages', messagesPeople);					
				}
				catch(err) {
					console.log("findUserMessages sorgusu hatali");
				}
			}					
    }); 
}

function getOldMessage(socket,room){	
	collectionmessages.find({'room' : room}, { limit : 10 },function(err, rows){
        if (err)
            console.log(err);
        else{
			for (var i = 0; i < rows.length; i++) {
				try {
					//console.log(rows[i].user1 + " : " + rows[i].message);
					socket.emit('old message', rows[i].usernameandsurname, rows[i].message);
					}
				catch(err) {
					console.log("hatali sorgu");}
			}
		}
    }); 
}
function getAllUsers(){	
	collectionusers.find({}, { },function(err, rows){
		
        if (err)
            console.log(err);
        else{
			for (var i = 0; i < rows.length; i++) {				
				allusernames[rows[i].username] = rows[i].username;
				allAndroidUsers.push({'user':rows[i].username,'username':rows[i].name,'usersurname':rows[i].surname,'online':'0'});
			}
		}
    }); 
}
function addUser(user,io){
	collectionusers.find({'username' : user}, { limit : 1 },function(err, rows){
        if (err)
            console.log(err);
        else{
			try {
				if(rows.length>=1){	
					io.emit('updateusers', allusernames,usernames);				
				}
				else{
					allusernames[user] = user;
					io.emit('updateusers', allusernames,usernames);
					collectionusers.insert({'username' : user}, function(err, doc){
						if(err)	{console.log("HATA");}
						else{
						}
				    });
					}
				}
				catch(err) {
					console.log("findUser sorgusu hatali");
				}
		}
    });	
}

//-------android--db--------------
function addNewUser(email,username,name,surname,password,socket){
	collectionusers.find({'email' : email}, { limit : 1 },function(err, rows){
        if (err)
            console.log(err);
        else{
			try {
				if(rows.length>=1){	
					socket.emit('already have account', email);				
				}
				else{
					try {				
					collectionusers.insert({'email':email,'username' : username,'name':name,'surname':surname,'password':password}, function(err, doc){
						if(err)	{console.log("HATA");}
						else{
						}
				    });
				    allusernames[username] = username;	
				    socket.emit('login', username,Email,name,surname,"Genel");
					}
					catch(err) {
						console.log("add user sorgusu hatali");
					}
				}
			}
			catch(err) {
				console.log("find user sorgusu hatali");
			}
		}
    });	
}
function loginControl(username,password,socket){
	collectionusers.find({$and : [{'username' : username},{'password' : password}]}, { limit : 1 },function(err, rows){
        if (err)
            console.log(err);
        else{
			try {
				if(rows.length>=1){	
					socket.username = username;
					socket.room = 'Genel';
					usernames[username] = username;		
					socket.join('Genel');
					socket.emit('login', username,rows[0].email,rows[0].name,rows[0].surname,"Genel");
					
					console.log(username + ' is being to login');								
				}
				else{	
				    socket.emit('login failed', username);	
				}
			}
			catch(err) {
				console.log(" loginControl sorgusu hatali");
			}
		}
    });	
}
function findPersonelMessages(user,socket) {
findUserOnlineOrNot(socket , 'Genel');
collectionrooms.find({ $or : [ {  'user1' : user  },{  'user2' : user  } ] }, {},function(err, rows){
        if (err)
            console.log(err);
        else{
				try {		
					for (var i = 0; i < rows.length; i++) {	
						if(rows[i].user1 == user){	
							findUserOnlineOrNot(socket , rows[i].user2);
						}
						else{					
							findUserOnlineOrNot(socket , rows[i].user1);
						}
					}				
				}
				catch(err) {
					console.log("findUserMessages sorgusu hatali");
				}
			}					
    }); 
}

//-------------db--end--------

//-------android other function---------------
function searchFriends(username , socket ) {
	try {							
		collectionusers.find({ 'username' : { $regex: username}}, {},function(err, rows){
			if (err)
				console.log(err);
			else{
				try {		
					for (var i = 0; i < rows.length; i++) {	
						if(socket.username != rows[i].username)
							findUserOnlineOrNot(socket , rows[i].username);
						//console.log(rows[i].username);
					}				
				}
				catch(err) 
				{
					console.log("seach friends sorgusu hatali");
				}
			}					
		}); 
	}
	catch(err)
	{
		console.log("seach friends sorgusu hatali");
	}
}

function userLogined(username,socket){
	try {
		socket.username = username;
		socket.room = 'Genel';
		socket.join('Genel');
		usernames[username] = username;
		for(var i=0;i<allAndroidUsers.length;i++) {
			if(username==allAndroidUsers[i]['user']){
				allAndroidUsers[i]['online'] = 1;
				return;
			}	
		}
		console.log(username + ' is being logined');
	}
	catch(err) {
		console.log(" userLogined fonksiyonunda hata var");
	}
}
function findUserOnlineOrNot(socket,username){
	for(var i=0;i<allAndroidUsers.length;i++) {
			if(username == allAndroidUsers[i]['user']){
				socket.emit('messageList' , allAndroidUsers[i]['username'] +" " + allAndroidUsers[i]['usersurname'] , allAndroidUsers[i]['online']);
				return;
			}	
		}
}
