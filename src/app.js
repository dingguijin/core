var userSessions = require('./middleware/userSessions');
var Webitel = require('./lib/WebitelModule2');
var log = require('./lib/log')(module);
var conf = require('./conf');
var httpServ = (conf.get('ssl:enabled')) ? require('https') : require('http');
var fs = require('fs');

var webitel = global.webitel = null;
var waitTimeReconnectWebitel = conf.get('webitelServer:reconnect') * 1000;

require('./middleware/logo')();

var doConnectWebitel = function() {
    webitel = global.webitel = new Webitel({
        server: conf.get('webitelServer:host'),
        port: conf.get('webitelServer:port'),
        account: conf.get('webitelServer:account'),
        secret: conf.get('webitelServer:secret')
    });


    webitel.on('webitel::socket::close', function (e) {
        log.error('Webitel error:', e);
        setTimeout(doConnectWebitel, waitTimeReconnectWebitel);
    });

    webitel.on('error', function (err) {
        log.warn('Webitel warn:', err);
    })
    webitel.on('webitel::event::auth::success', function () {
        log.info('Connect Webitel - OK');
        webitel.subscribe('all');
    });

    webitel.on('webitel::event::auth::fail', function () {
        webitel.authed = false;
        log.error('webitel::event::auth::fail');
    });

    webitel.on('webitel::end', function () {
        webitel.authed = false;
        log.error('Webitel: socket close.');
    });

    webitel.on('webitel::event::disconnect::notice', function () {
        log.error('webitel::event::disconnect::notice');
    });

    webitel.on('webitel::event::event::**', require('./middleware/webitelEvents').eventsHandle);

    if (conf.get('application:sleepConnectToWebitel')) {
        setTimeout(function () {
            webitel.connect();
        }, conf.get('application:sleepConnectToWebitel'));
    } else {
        webitel.connect();
    }
    ;
};
doConnectWebitel();

var eslConn = global.eslConn = null,
    waitTimeReconnectFreeSWITCH = conf.get('freeSWITCH:reconnect') * 1000;

var esl = require('modesl');

var eslConnected = false;

var doConnectFreeSWITCH = function() {
    if (eslConn && eslConn['authed']) {
        return;
    }
    eslConn = global.eslConn = null;
    eslConn = global.eslConn = new esl.Connection(conf.get('freeSWITCH:host'),
        conf.get('freeSWITCH:port'),
        conf.get('freeSWITCH:pwd'), function() {
            log.info('Connect freeSWITCH - OK');
            this.apiCallbackQueue.length = 0;
            eslConnected = true;
        });

    eslConn.on('error', function(e) {
        log.error('freeSWITCH connect error:', e);
        eslConn['authed'] = false;
        eslConnected = false;
        setTimeout(doConnectFreeSWITCH, waitTimeReconnectFreeSWITCH);
    });

    eslConn.on('esl::event::auth::success', function () {
        var ev = conf.get('application:freeSWITCHEvents');
        eslConnected = true;
        eslConn.subscribe(ev);
    });

    eslConn.on('esl::event::auth::fail', function () {
        eslConnected = false;
        eslConn['authed'] = false;
        log.error('esl::event::auth::fail');
    });

    eslConn.on('esl::end', function () {
        eslConnected = false;
        eslConn['authed'] = false;
        log.error('FreeSWITCH: socket close.');
    });

    eslConn.on('esl::event::disconnect::notice', function() {
        log.error('esl::event::disconnect::notice');
        eslConnected = false;
        this.apiCallbackQueue.length = 0;
        this.cmdCallbackQueue.length = 0;
        eslConn['authed'] = false;
        setTimeout(doConnectFreeSWITCH, waitTimeReconnectFreeSWITCH);
    });

    eslConn.on('esl::event::**', require('./middleware/eslEvents').eventsHandle);

};
doConnectFreeSWITCH();

var wsOriginAllow = conf.get('server:socket:originHost');
var handleVerifyClient = function (req) {
    if (wsOriginAllow) {
        return (req.origin.indexOf(wsOriginAllow) == -1)
            ? false
            : true;
    };
   return true;
};

var app;
var processRequest = require('./middleware/httpRoute').processRequest;
try {
    if (conf.get('ssl:enabled')) {
        app = httpServ.createServer({
            key: fs.readFileSync(conf.get('ssl:ssl_key')),
            cert: fs.readFileSync(conf.get('ssl:ssl_cert'))
        }, processRequest).listen(conf.get('server:port'), conf.get('server:host'));
    } else {
        app = httpServ.createServer(processRequest).listen(conf.get('server:port'), conf.get('server:host'));
    };
} catch (e) {
    log.error('Server create:' + e.message);
}
app.on('error', function () {
    log.error('Server error: ',arguments);
});
app.on('close', function () {
    log.error('Server close:', arguments);
});

var WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({
        server: app,
        verifyClient: handleVerifyClient
    });

require('./middleware/webSocketHandler')(wss);
wss.broadcast = function(data) {
    for (var i in this.clients)
        this.clients[i].send(data);
};
