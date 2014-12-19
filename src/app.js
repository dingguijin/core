var userSessions = require('./middleware/userSessions');
var Webitel = require('./lib/WebitelModule2');
var log = require('./lib/log')(module);
var conf = require('./conf');
var httpServ = (conf.get('ssl:enabled')) ? require('https') : require('http');
var fs = require('fs');
var handleSocketError = require('./middleware/handleSocketError');

var webitel = global.webitel = null;
var waitTimeReconnectWebitel = conf.get('webitelServer:reconnect') * 1000;

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
		setTimeout(doConnectWebitel, waitTimeReconnectWebitel);
    })
    webitel.on('webitel::event::auth::success', function () {
        log.info('Connect Webitel - OK');
//        webitel.subscribe('all');
    });

    webitel.on('webitel::event::auth::fail', function () {
        log.error('webitel::event::auth::fail');
		setTimeout(doConnectWebitel, waitTimeReconnectWebitel);
    });

    webitel.on('webitel::end', function () {
        log.error('Webitel: socket close.');
		setTimeout(doConnectWebitel, waitTimeReconnectWebitel);
    });

    webitel.on('webitel::event::disconnect::notice', function () {
        log.error('webitel::event::disconnect::notice');
		setTimeout(doConnectWebitel, waitTimeReconnectWebitel);
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

var doSendFreeSWITCHCommand = function (id, socket) {
    if (!eslConnected) {
        try {
            socket.send(JSON.stringify({
                'exec-uuid': id,
                'exec-complete': '+ERR',
                'exec-response': {
                    'response': 'FreeSWITCH connect error.'
                }
            }))
            return false;
        } catch (e) {
            log.warn('User socket close:', e.message);
            return false;
        };
    };
    return true;
};

var doConnectFreeSWITCH = function() {
    eslConn = global.eslConn = null;
    eslConn = global.eslConn = new esl.Connection(conf.get('freeSWITCH:host'),
        conf.get('freeSWITCH:port'),
        conf.get('freeSWITCH:pwd'), function() {
            log.info('Connect freeSWITCH - OK');
            eslConnected = true;
        });

    eslConn.on('error', function(e) {
        log.error('freeSWITCH connect error:', e);
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
        log.error('esl::event::auth::fail');
    });

    eslConn.on('esl::end', function () {
        eslConnected = false;
        log.error('FreeSWITCH: socket close.');
    });

    eslConn.on('esl::event::disconnect::notice', function() {
        log.error('esl::event::disconnect::notice');
        eslConnected = false;
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
//require('./middleware/webSocketServer')(wss, eslConn);
var WebitelCommandTypes = require('./consts').WebitelCommandTypes,
    checkUser = require('./middleware/checkUser'),
    socketTimeUnauthorized = conf.get('application:socketTimeUnauthorized');

wss.on('connection', function(ws) {
    if (socketTimeUnauthorized > 0) {
        setTimeout(function () {
            if (!ws['upgradeReq']['webitelId']) {
                try {
                    ws.send(JSON.stringify({
                        "webitel-event-name": "account",
                        "Event-Name": "DISCONNECT"
                    }));
                    ws.close();
                } catch (e) {
                    log.warn('User socket close:', e.message);
                }
            }
        }, socketTimeUnauthorized * 1000);
    }
    ws.on('message', function(message) {
        log.info('received: %s', message);
        try {
            var msg = JSON.parse(message);
            var execId = msg['exec-uuid'];
            var args = msg['exec-args'];

            switch (msg['exec-func']) {
                case WebitelCommandTypes.Auth:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    checkUser(msg['exec-args']['account'], msg['exec-args']['secret'], function (err) {
                        if (err) {
                            try {
                                ws.send(JSON.stringify({
                                    'exec-uuid': execId,
                                    'exec-complete': '+ERR',
                                    'exec-response': {
                                        'login': err
                                    }
                                }));
                                ws.close();
                            } catch (e) {
                                log.warn('User socket close:', e.message);
                            };
                        } else {
                            try {
                                var webitelId = msg['exec-args']['account'];
                                ws['upgradeReq']['webitelId'] = webitelId;
                                var user = Users.get(webitelId);
                                if (!user) {
                                    Users.add(webitelId, {
                                        ws: [ws],
                                        id: msg['exec-args']['account']
                                    });
                                } else {
                                    user.ws.push(ws);
                                };
                                log.info('Users session: ', Users.length());

                                ws.send(JSON.stringify({
                                    'exec-uuid': execId,
                                    'exec-complete': '+OK',
                                    'exec-response': {
                                        'login': webitelId
                                    }
                                }));
                            } catch (e) {
                                log.warn('User socket close:', e.message);
                            }
                        }
                    });
                    break;
                case WebitelCommandTypes.Call:
					if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _originatorParam = new Array('w_jsclient_originate_number=' + args['extension']),
                        _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
                        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

                    eslConn.bgapi(('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'] +
                        ' xml default ' + args['user'] + ' ' + args['user']), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttendedTransfer:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _originatorParam = new Array('w_jsclient_originate_number=' + args['destination'],
                            'w_jsclient_xtransfer=' + args['call_uuid']);
                    if (args['is_webrtc']) {
                        _originatorParam.push('sip_h_Call-Info=answer-after=1');
                    };
                    var _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
                        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

                    eslConn.bgapi(('originate ' + _param + 'user/' + args['user'] + ' ' + args['destination'] +
                        ' xml default ' + args['user'] + ' ' + args['user']), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Transfer:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_transfer ' + args['channel-uuid'] + ' ' +
                        args['destination'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Bridge:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_bridge ' + args['channel_uuid_A'] + ' ' + args['channel_uuid_B'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Hangup:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_kill ' + args['channel-uuid'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.ToggleHold:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_hold toggle ' + args['channel-uuid'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Hold:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_hold ' + args['channel-uuid']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.UnHold:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_hold off ' + args['channel-uuid']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Dtmf:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _digits = args['digits'];
                    eslConn.api(('uuid_recv_dtmf ' + args['channel-uuid'] + ' ' + args['digits']), function (res) {
                        try {
                            if (res['body'] && res['body'].indexOf('-ERR no reply') == 0) {
                                res['body'] = '+OK ' + _digits;
                                getCommandResponseJSON(ws, execId, res)
                            } else {
                                getCommandResponseJSON(ws, execId, res)
                            }
                        } catch (e) {
                            log.error('Command DTMF: %s', e);
                        }
                    });
                    break;
                case WebitelCommandTypes.Broadcast:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_broadcast ' + args['application']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.AttXfer:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_broadcast ' + args['channel-uuid'] + ' set::origination_cancel_key=#'), function () {
                        eslConn.api(('uuid_broadcast ' + args['channel-uuid'] + ' att_xfer::user/' + args['destination'] + ''), function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                    });
                    break;
                case WebitelCommandTypes.AttXfer2:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _originatorParam = new Array('w_jsclient_originate_number=' + args['extension'],
                            'w_jsclient_xtransfer=' + args['parent_call_uuid']),
                        _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
                        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';
                    var dialString = ('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'].split('@')[0] +
                        ' xml default ' + args['user'].split('@')[0] + ' ' + args['user'].split('@')[0]);
                    log.info('att_xfer2_dial ',dialString);
                    eslConn.bgapi(dialString, function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttXferBridge:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_bridge ' + args['channel-uuid-leg-c'] + ' ' + args['channel-uuid-leg-b'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttXferCancel:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_kill ' + args['channel-uuid-leg-c'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.GetVar:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_getvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' +
                        (args['inleg'] || ''), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.SetVar:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_setvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' + args['value'] + ' ' +
                        (args['inleg'] || ''), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                // System Commands

                // Domain
                case WebitelCommandTypes.Domain.List:
                    webitel.domainList(args['customerId'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Domain.Create:
                    webitel.domainCreate(args['name'] || '', args['customerId'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Domain.Remove:
                    webitel.domainRemove(args['name'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                // User
                case WebitelCommandTypes.Account.List:
                    webitel.userList(args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Create:
                    webitel.userCreate(args['role'] || '', args['param'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Change:
                    webitel.userUpdate(args['user'] || '', args['param'] || '', args['value'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Remove:
                    webitel.userRemove(args['user'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                // Device
                case WebitelCommandTypes.Device.List:
                    webitel.deviceList(args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Create:
                    webitel.deviceCreate(args['type'] || '', args['param'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Change:
                    webitel.deviceUpdate(args['device'] || '', args['param'] || '', args['value'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Remove:
                    webitel.deviceRemove(args['device'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.ListUsers:
                    webitel.list_users(args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                // Favbet
                case WebitelCommandTypes.Logout:
                    ws['upgradeReq']['logged'] = false;
                    sendCommandResponseWebitel(ws, execId, {
                        status: '+OK',
                        body: 'Successfuly logged out.'
                    });
                    break;
                case WebitelCommandTypes.Login:
                    ws['upgradeReq']['logged'] = true;
                    sendCommandResponseWebitel(ws, execId, {
                        status: '+OK',
                        body: 'Successfuly logged in.'
                    });
                    break;
                case WebitelCommandTypes.ReloadAgents:
                    webitel.reloadAgents(function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                default :
                    ws.send(JSON.stringify({
                        'exec-uuid': execId,
                        'exec-complete': '-ERR',
                        'exec-response': {
                            'response': 'Command not found: ' + msg['exec-func']
                        }
                    }));
                    // TODO handle error send socket
                    log.warn('Command error: ', msg);
            };

        } catch (e) {
            handleSocketError(ws);
            log.error('Command error:', e.message);
        }
    });

    var getCommandResponseJSON = function (_ws, id, res) {
        try {
            _ws.send(JSON.stringify({
                'exec-uuid': id,
                'exec-complete': (res['body'].indexOf('-ERR') == 0) ? "-ERR" : "+OK",
                'exec-response': {
                    'response': res['body']
                }
            }));
        } catch (e) {
            handleSocketError(_ws);
            log.warn('Error send response');
        }
    };

    var sendCommandResponseWebitel = function (_ws, id, res) {
        try {
            _ws.send(JSON.stringify({
                'exec-uuid': id,
                'exec-complete': res.status,
                'exec-response': {
                    'response': res['body']
                }
            }));
        } catch (e) {
            handleSocketError(_ws);
            log.warn(e.message);
        };
    };

    ws.on('close', function () {
        try {
            var agentId = this['upgradeReq']['webitelId'];
            var user = Users.get(agentId);
            if (user && user.ws) {
                for (var key in user.ws) {
                    if (this == user.ws[key]) {
                        user.ws.splice(key, 1);
                        if (user.ws.length == 0) {
                            Users.remove(agentId);
                            log.info('disconnect: ', agentId);
                            log.info('Users session: ', Users.length());
                        };
                    };
                };
            };
        } catch (e) {
            log.error(e);
        }
    });

    ws.on('error', function(e) {
        log.error('Socket error:', e);
    });
});

wss.broadcast = function(data) {
    for (var i in this.clients)
        this.clients[i].send(data);
};