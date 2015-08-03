var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
  
server.listen(8003);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

require('./routes')(io);
