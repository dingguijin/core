var userSessions = require('./middleware/userSessions');
var Webitel = require('./lib/WebitelModule2');
var log = require('./lib/log')(module);
var conf = require('./conf');
var httpServ = (conf.get('ssl:enabled')) ? require('https') : require('http');
var fs = require('fs');
var handleSocketError = require('./middleware/handleSocketError');

var webitel = global.webitel = null;
var waitTimeReconnectWebitel = conf.get('webitelServer:reconnect') * 1000;
var ACCOUNT_EVENTS = require('./consts').ACCOUNT_EVENTS;

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

var doSendWebitelCommand = function (id, socket, command) {
    var _user = Users.get(socket['upgradeReq']['webitelId']);
    if (!_user || (_user['attr']['role'].val < command.perm)) {
        socket.send(JSON.stringify({
            'exec-uuid': id,
            'exec-complete': '+ERR',
            'exec-response': {
                'response': '-ERR permission denied!'
            }
        }));
        return null
    } else if (!webitel.authed) {
        try {
            socket.send(JSON.stringify({
                'exec-uuid': id,
                'exec-complete': '+ERR',
                'exec-response': {
                    'response': 'Webitel connect error.'
                }
            }));
            return null;
        } catch (e) {
            log.warn('User socket close:', e.message);
            return null;
        };
    };
    return _user;
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
        log.trace('received: %s', message);
        try {
            var msg = JSON.parse(message);
            var execId = msg['exec-uuid'];
            var args = msg['exec-args'];

            switch (msg['exec-func']) {
                case WebitelCommandTypes.Auth.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    checkUser(msg['exec-args']['account'], msg['exec-args']['secret'], function (err, userParam) {
                        if (err) {
                            try {
                                ws.send(JSON.stringify({
                                    'exec-uuid': execId,
                                    'exec-complete': '+ERR',
                                    'exec-response': {
                                        'login': err
                                    }
                                }));
//                                ws.close();
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
                                        id: msg['exec-args']['account'],
                                        logged: false,
                                        attr: userParam
                                    });
                                } else {
                                    user['attr'] = userParam;
                                    user.ws.push(ws);
                                };
                                log.debug('Users session: ', Users.length());

                                ws.send(JSON.stringify({
                                    'exec-uuid': execId,
                                    'exec-complete': '+OK',
                                    'exec-response': {
                                        'login': webitelId,
                                        'role': userParam.role.name,
                                        'domain': userParam.domain
                                    }
                                }));
                            } catch (e) {
                                log.warn('User socket close:', e.message);
                            }
                        }
                    });
                    break;
                case WebitelCommandTypes.Call.name:
                    var _originatorParam = new Array('w_jsclient_originate_number=' + args['extension']),
                        _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
                        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

                    eslConn.bgapi(('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'] +
                        ' xml default ' + args['user'] + ' ' + args['user']), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttendedTransfer.name:
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
                case WebitelCommandTypes.Transfer.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_transfer ' + args['channel-uuid'] + ' ' +
                        args['destination'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Bridge.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_bridge ' + args['channel_uuid_A'] + ' ' + args['channel_uuid_B'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Hangup.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_kill ' + args['channel-uuid'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.ToggleHold.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_hold toggle ' + args['channel-uuid'], function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Hold.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_hold ' + args['channel-uuid']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.UnHold.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_hold off ' + args['channel-uuid']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Dtmf.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_recv_dtmf ' + args['channel-uuid'] + ' ' + args['digits']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.Broadcast.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(('uuid_broadcast ' + args['application']), function (res) {
                        getCommandResponseJSON(ws, execId, res)
                    });
                    break;
                case WebitelCommandTypes.AttXfer.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        var _account = args['user'].split('@')[0];
                        eslConn.api(('uuid_broadcast ' + args['channel-uuid'] + ' att_xfer::{origination_cancel_key=#,origination_caller_id_name=' +
                            _account + ',origination_caller_id_number=' + _account +
                            ',webitel_att_xfer=true}user/' + args['destination'] + ''), function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                    break;
                case WebitelCommandTypes.AttXfer2.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _originatorParam = new Array('w_jsclient_originate_number=' + args['extension'],
                            'w_jsclient_xtransfer=' + args['parent_call_uuid']),
                        _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
                        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';
                    var dialString = ('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'].split('@')[0] +
                        ' xml default ' + args['user'].split('@')[0] + ' ' + args['user'].split('@')[0]);
                    eslConn.bgapi(dialString, function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttXferBridge.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_bridge ' + args['channel-uuid-leg-c'] + ' ' + args['channel-uuid-leg-b'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.AttXferCancel.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _play = 'start',
                        killCn = args['kill-channel'] || true;
                    _play += ' silence_stream://0 3';
                    eslConn.api('uuid_displace ' + args['channel-uuid-leg-b'] + ' ' + _play, function (res) {
                        if (killCn) {
                            eslConn.api('uuid_kill ' + args['channel-uuid-leg-c'], function (res) {
                                getCommandResponseJSON(ws, execId, res);
                            });
                        } else {
                            getCommandResponseJSON(ws, execId, res);
                        };
                    });
                    break;

                case WebitelCommandTypes.Dump.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_dump ' + args['channel-uuid'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                case WebitelCommandTypes.GetVar.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_getvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' +
                        (args['inleg'] || ''), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.SetVar.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api('uuid_setvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' + args['value'] + ' ' +
                        (args['inleg'] || ''), function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Eavesdrop.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.bgapi('originate user/' + (args['user'] || '') + ' &eavesdrop(' + (args['channel-uuid'] || '') +
                        ') XML default ' + args['side'] + ' ' + args['side'], function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Displace.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    var _play = args['record'] == 'start'
                        ? 'start'
                        : 'stop';
                    _play += ' silence_stream://0 3';
                    eslConn.api('uuid_displace ' + args['channel-uuid'] + ' ' + _play, function (res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                // System Commands

                // User status


                // Domain
                case WebitelCommandTypes.Domain.List.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.List);
                    if (!_caller) return;
                    webitel.domainList(_caller, args['customerId'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Domain.Create.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.Create);
                    if (!_caller) return;
                    webitel.domainCreate(_caller, args['name'] || '', args['customerId'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Domain.Remove.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.Remove);
                    if (!_caller) return;
                    webitel.domainRemove(_caller, args['name'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                // User
                case WebitelCommandTypes.Account.List.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.List);
                    if (!_caller) return;
                    webitel.userList(_caller, args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Create.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Create);
                    if (!_caller) return;
                    webitel.userCreate(_caller, args['role'] || '', args['param'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Change.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Change);
                    if (!_caller) return;
                    webitel.userUpdate(_caller, args['user'] || '', args['param'] || '', args['value'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Account.Remove.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Remove);
                    if (!_caller) return;
                    webitel.userRemove(_caller, args['user'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                // Device
                case WebitelCommandTypes.Device.List.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.List);
                    if (!_caller) return;
                    webitel.deviceList(_caller, args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Create.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Create);
                    if (!_caller) return;
                    webitel.deviceCreate(_caller, args['type'] || '', args['param'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Change.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Change);
                    if (!_caller) return;
                    webitel.deviceUpdate(_caller, args['device'] || '', args['param'] || '', args['value'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.Device.Remove.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Remove);
                    if (!_caller) return;
                    webitel.deviceRemove(_caller, args['device'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;
                case WebitelCommandTypes.ListUsers.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.ListUsers);
                    if (!_caller) return;
                    webitel.list_users(_caller, args['domain'] || '', function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                case WebitelCommandTypes.Logout.name:
                    ws['upgradeReq']['logged'] = false;
                    var jsonEvent,
                        webitelId = ws['upgradeReq']['webitelId'] || '',
                        _domain = webitelId.split('@')[1],
                        _id = webitelId.split('@')[0],
                        _user = Users.get(webitelId);
                    if (_user) {
                        try {
                            _user.logged = false;
                            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.OFFLINE, _domain, _id);
                            log.debug(jsonEvent['Event-Name'] + ' -> ' + webitelId);
                            Domains.broadcast(_domain, JSON.stringify(jsonEvent));
                        } catch (e) {
                            log.warn('Broadcast account event: ', domain);
                        };
                        sendCommandResponseWebitel(ws, execId, {
                            status: '+OK',
                            body: 'Successfuly logged out.'
                        });
                    } else {
                        sendCommandResponseWebitel(ws, execId, {
                            status: '-ERR',
                            body: 'Error logged out.'
                        });
                    }
                    break;

                case WebitelCommandTypes.Login.name:
                    ws['upgradeReq']['logged'] = true;
                    var jsonEvent,
                        webitelId = ws['upgradeReq']['webitelId'] || '',
                        _domain = webitelId.split('@')[1],
                        _id = webitelId.split('@')[0],
                        _user = Users.get(webitelId);
                    if (_user) {
                        try {
                            _user.logged = true;
                            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.ONLINE, _domain, _id);
                            log.debug(jsonEvent['Event-Name'] + ' -> ' + webitelId);
                            Domains.broadcast(_domain, JSON.stringify(jsonEvent));
                        } catch (e) {
                            log.warn('Broadcast account event: ', domain);
                        };
                        sendCommandResponseWebitel(ws, execId, {
                            status: '+OK',
                            body: 'Successfuly logged in.'
                        });
                    } else {
                        sendCommandResponseWebitel(ws, execId, {
                            status: '-ERR',
                            body: 'Error logged in.'
                        });
                    }
                    break;
                case WebitelCommandTypes.ReloadAgents.name:
                    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.ReloadAgents);
                    if (!_caller) return;
                    webitel.reloadAgents(_caller, function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                case WebitelCommandTypes.Rawapi.name:
                    if (!doSendFreeSWITCHCommand(execId, ws)) return;
                    eslConn.api(args['command'], function(res) {
                        getCommandResponseJSON(ws, execId, res);
                    });
                    break;

                case WebitelCommandTypes.SipProfile.List.name:
                    // Пока нету смысла делать поиск пользователя для всех команд freeSWITCH
                    var _user = Users.get(ws['upgradeReq']['webitelId']);
                    if (!_user || (_user['attr']['role'].val < WebitelCommandTypes.SipProfile.List.perm)) {
                        socket.send(JSON.stringify({
                            'exec-uuid': id,
                            'exec-complete': '+ERR',
                            'exec-response': {
                                'response': '-ERR permission denied!'
                            }
                        }));
                        return null
                    }

                    eslConn.api('sofia status', function (res) {
                        log.trace(res['body']);
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
                'exec-complete': (res['body'].indexOf('-ERR') == 0 || res['body'].indexOf('-USAGE') == 0) ? "-ERR" : "+OK",
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
                            log.trace('disconnect: ', agentId);
                            log.debug('Users session: ', Users.length());
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

var getJSONUserEvent = function (eventName, domainName, userId) {
    return {
        "Event-Name": eventName,
        "Event-Domain": domainName,
        "User-ID": userId,
        "User-Domain": domainName,
        "User-Scheme":"account",
        "Content-Type":"text/event-json",
        "webitel-event-name":"user"
    };
};