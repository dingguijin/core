var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 10022 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
	var msg = JSON.parse(message);
	ws.send(JSON.stringify({"exec-uuid":msg['exec-uuid'],"exec-complete":"+OK","exec-response":{"response":"Successfuly logged in."}}))
  });
  
});