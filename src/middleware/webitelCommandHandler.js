/**
 * Created by i.n. on 10.04.2015.
 */

var WebitelCommandTypes = require('../consts').WebitelCommandTypes,
    log = require('../lib/log')(module),
    auth = require('../routes/V2/auth'),
    checkUser = require('../middleware/checkUser'),
    eventCollection = require('./EventsCollection'),
    ACCOUNT_EVENTS = require('../consts').ACCOUNT_EVENTS,
    handleSocketError = require('../middleware/handleSocketError'),
    User = require('../lib/User');

commandEmitter.on('wss::' + WebitelCommandTypes.Auth.name, function (execId, args, ws) {
    checkUser(args['account'], args['secret'], function (err, userParam) {
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
                var webitelId = args['account'];
                ws['upgradeReq']['webitelId'] = webitelId;
                var user = Users.get(webitelId);
                if (!user) {
                    user = new User(args['account'], ws, {
                        attr: userParam,
                        logged: false
                    });
                    Users.add(webitelId, user);
                    /*Users.add(webitelId, {
                        ws: [ws],
                        id: args['account'],
                        logged: false,
                        attr: userParam
                    });*/
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
                        'domain': userParam.domain,
                        'cc-agent': userParam['cc-agent']
                    }
                }));
            } catch (e) {
                log.warn('User socket close:', e.message);
            }
        }
    });
});

// TODO перенести в модуль eventCollection
commandEmitter.on('wss::' + WebitelCommandTypes.Event.On.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Event.On);
    if (!_caller) return;
    eventCollection.addListener(args['event'], ws['upgradeReq']['webitelId'], ws['webitelSessionId'],
        function (err, resStr) {
            var res = {
                "body": err
                    ? "-ERR: " + err.message
                    : resStr
            };
            getCommandResponseJSON(ws, execId, res);
        });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Event.Off.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Event.Off);
    if (!_caller) return;
    eventCollection.removeListener(args['event'], ws['upgradeReq']['webitelId'], ws['webitelSessionId'],
        function (err, resStr) {
            var res = {
                "body": err
                    ? "-ERR: " + err.message
                    : resStr
            };
            getCommandResponseJSON(ws, execId, res);
        });
});
// END TODO

commandEmitter.on('wss::' + WebitelCommandTypes.Logout.name, function (execId, args, ws) {
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
            Domains.broadcast(_domain, jsonEvent);
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
    };
});

commandEmitter.on('wss::' + WebitelCommandTypes.Login.name, function (execId, args, ws) {
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
            Domains.broadcast(_domain, jsonEvent);
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
    };
});

commandEmitter.on('wss::' + WebitelCommandTypes.Token.Generate.name, function (execId, args, ws) {
    var username = ws['upgradeReq']['webitelId'];
    if (!username) {
        ws.send(JSON.stringify({
            'exec-uuid': execId,
            'exec-complete': '+ERR',
            'exec-response': {
                'response': '-ERR permission denied!'
            }
        }));
        return null
    };

    auth.getTokenObject(username, args['password'], function (err, dbUser) {
        if (err) {
            ws.send(JSON.stringify({
                'exec-uuid': execId,
                'exec-complete': '+ERR',
                'exec-response': {
                    'response': err
                }
            }));
            return;
        }
        getCommandResponseJSON(ws, execId, {
            body: JSON.stringify(dbUser)
        });
    });
});



commandEmitter.on('wss::' + WebitelCommandTypes.ListUsers.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.ListUsers);
    if (!_caller) return;
    webitel.list_users(_caller, args['domain'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Domain.List.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.List);
    if (!_caller) return;
    webitel.domainList(_caller, args['customerId'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Domain.Create.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.Create);
    if (!_caller) return;
    webitel.domainCreate(_caller, args['name'] || '', args['customerId'] || '', args['parameters'], function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Domain.Remove.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Domain.Remove);
    if (!_caller) return;
    webitel.domainRemove(_caller, args['name'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Account.List.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.List);
    if (!_caller) return;
    webitel.userList(_caller, args['domain'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Account.Create.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Create);
    if (!_caller) return;
    webitel.userCreate(_caller, args['role'] || '', args['param'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Account.Change.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Change);
    if (!_caller) return;
    webitel.userUpdate(_caller, args['user'] || '', args['param'] || '', args['value'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Account.Remove.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Remove);
    if (!_caller) return;
    webitel.userRemove(_caller, args['user'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Account.Remove.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Account.Remove);
    if (!_caller) return;
    webitel.userRemove(_caller, args['user'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Device.List.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.List);
    if (!_caller) return;
    webitel.deviceList(_caller, args['domain'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Device.Create.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Create);
    if (!_caller) return;
    webitel.deviceCreate(_caller, args['type'] || '', args['param'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Device.Change.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Change);
    if (!_caller) return;
    webitel.deviceUpdate(_caller, args['device'] || '', args['param'] || '', args['value'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Device.Remove.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Device.Remove);
    if (!_caller) return;
    webitel.deviceRemove(_caller, args['device'] || '', function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.ReloadAgents.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.ReloadAgents);
    if (!_caller) return;
    webitel.reloadAgents(_caller, function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.List.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.List);
    if (!_caller) return;
    webitel.showSipGateway(_caller, args['domain'], function(res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Create.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Create);
    if (!_caller) return;
    webitel.createSipGateway(_caller, args, function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Change.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Create);
    if (!_caller) return;
    webitel.changeSipGateway(_caller, args['name'], args['type'], args['params'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Remove.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Remove);
    if (!_caller) return;
    webitel.removeSipGateway(_caller, args['name'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Up.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Up);
    if (!_caller) return;
    webitel.upSipGateway(_caller, args['name'], args['profile'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Down.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Down);
    if (!_caller) return;
    webitel.downSipGateway(_caller, args['name'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Down.name, function (execId, args, ws) {
    var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Down);
    if (!_caller) return;
    webitel.downSipGateway(_caller, args['name'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
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