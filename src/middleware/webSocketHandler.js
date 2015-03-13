var WebitelCommandTypes = require('../consts').WebitelCommandTypes,
    checkUser = require('../middleware/checkUser'),
    conf = require('../conf'),
    socketTimeUnauthorized = conf.get('application:socketTimeUnauthorized'),
    log = require('../lib/log')(module),
    ACCOUNT_EVENTS = require('../consts').ACCOUNT_EVENTS,
    handleSocketError = require('../middleware/handleSocketError'),
    auth = require('../routes/V2/auth'),
    eventCollection = require('./EventsCollection'),
    generateUuid = require('node-uuid');


module.exports = function (wss) {
    wss.on('connection', function(ws) {

        ws['webitelSessionId'] = generateUuid.v4();

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
                        eslConn.bgapi('uuid_transfer ' + args['channel-uuid'] + ' ' +
                            args['destination'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;
                    case WebitelCommandTypes.Bridge.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_bridge ' + args['channel_uuid_A'] + ' ' + args['channel_uuid_B'], function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.Hangup.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_kill ' + args['channel-uuid'], function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.ToggleHold.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_hold toggle ' + args['channel-uuid'], function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.Hold.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi(('uuid_hold ' + args['channel-uuid']), function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.UnHold.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi(('uuid_hold off ' + args['channel-uuid']), function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.Dtmf.name:
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
                            };
                        });
                        break;
                    case WebitelCommandTypes.Broadcast.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi(('uuid_broadcast ' + args['application']), function (res) {
                            getCommandResponseJSON(ws, execId, res)
                        });
                        break;
                    case WebitelCommandTypes.AttXfer.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        var _account = args['user'].split('@')[0];
                        eslConn.bgapi(('uuid_broadcast ' + args['channel-uuid'] + ' att_xfer::{origination_cancel_key=#,origination_caller_id_name=' +
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
                            _param = '{' + _originatorParam.concat(_autoAnswerParam).join(',') + '}';
                        var dialString = ('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'].split('@')[0] +
                        ' xml default ' + args['user'].split('@')[0] + ' ' + args['user'].split('@')[0]);
                        log.trace(dialString);
                        eslConn.bgapi(dialString, function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;
                    case WebitelCommandTypes.AttXferBridge.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_bridge ' + args['channel-uuid-leg-c'] + ' ' + args['channel-uuid-leg-b'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;
                    case WebitelCommandTypes.AttXferCancel.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_kill ' + args['channel-uuid-leg-c'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Dump.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_dump ' + args['channel-uuid'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.GetVar.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_getvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' +
                        (args['inleg'] || ''), function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;
                    case WebitelCommandTypes.SetVar.name:
                        if (!doSendFreeSWITCHCommand(execId, ws)) return;
                        eslConn.bgapi('uuid_setvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' + args['value'] + ' ' +
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
                        eslConn.bgapi('uuid_displace ' + args['channel-uuid'] + ' ' + _play, function (res) {
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

                    case WebitelCommandTypes.Event.On.name:
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
                        break;

                    case WebitelCommandTypes.Event.Off.name:
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

                    case WebitelCommandTypes.Gateway.List.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.List);
                        if (!_caller) return;
                        webitel.showSipGateway(_caller, args['domain'], function(res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Create.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Create);
                        if (!_caller) return;
                        webitel.createSipGateway(_caller, args, function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Change.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Create);
                        if (!_caller) return;
                        webitel.changeSipGateway(_caller, args['name'], args['type'], args['params'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Remove.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Remove);
                        if (!_caller) return;
                        webitel.removeSipGateway(_caller, args['name'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Up.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Up);
                        if (!_caller) return;
                        webitel.upSipGateway(_caller, args['name'], args['profile'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Down.name:
                        var _caller = doSendWebitelCommand(execId, ws, WebitelCommandTypes.Gateway.Down);
                        if (!_caller) return;
                        webitel.downSipGateway(_caller, args['name'], function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.Gateway.Kill.name:
                        // Пока нету смысла делать поиск пользователя для всех команд freeSWITCH
                        var _user = Users.get(ws['upgradeReq']['webitelId']);
                        if (!_user || (_user['attr']['role'].val < WebitelCommandTypes.Gateway.Kill.perm)) {
                            ws.send(JSON.stringify({
                                'exec-uuid': execId,
                                'exec-complete': '+ERR',
                                'exec-response': {
                                    'response': '-ERR permission denied!'
                                }
                            }));
                            return null
                        };

                        eslConn.bgapi('sofia profile ' + (args['profile'] || '') + ' killgw ' +
                        (args['gateway'] || ''), function (res) {
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;

                    case WebitelCommandTypes.SipProfile.List.name:
                        // Пока нету смысла делать поиск пользователя для всех команд freeSWITCH
                        var _user = Users.get(ws['upgradeReq']['webitelId']);
                        if (!_user || (_user['attr']['role'].val < WebitelCommandTypes.SipProfile.List.perm)) {
                            ws.send(JSON.stringify({
                                'exec-uuid': execId,
                                'exec-complete': '+ERR',
                                'exec-response': {
                                    'response': '-ERR permission denied!'
                                }
                            }));
                            return null
                        };

                        eslConn.bgapi('sofia status', function (res) {
                            webitel._parsePlainTableToJSON(res['body'], null, function (err, resJSON) {
                                if (err) {
                                    getCommandResponseJSON(ws, execId, {
                                        'status': '-ERR',
                                        'body': err
                                    });
                                    return;
                                }
                                sendCommandResponseWebitel(ws, execId, {
                                    'status': '+OK',
                                    'body': resJSON
                                });
                            })
                        });
                        break;

                    case WebitelCommandTypes.SipProfile.Rescan.name:
                        // Пока нету смысла делать поиск пользователя для всех команд freeSWITCH
                        var _user = Users.get(ws['upgradeReq']['webitelId']);
                        if (!_user || (_user['attr']['role'].val < WebitelCommandTypes.SipProfile.List.perm)) {
                            ws.send(JSON.stringify({
                                'exec-uuid': execId,
                                'exec-complete': '+ERR',
                                'exec-response': {
                                    'response': '-ERR permission denied!'
                                }
                            }));
                            return null
                        };

                        eslConn.bgapi('sofia profile ' + (args['profile'] || '') + ' rescan', function (res) {
                            if (res['body'].indexOf('Invalid ') == 0)
                                res['body'] = '-ERR ' + res['body'];
                            getCommandResponseJSON(ws, execId, res);
                        });
                        break;


                    case WebitelCommandTypes.Token.Generate.name:
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
                        break;

                    case WebitelCommandTypes.Show.Channel.name:
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

                        var _domain = username.split('@')[1] || args['domain'],
                            _item = '';
                        if (_domain) {
                            _item = ' like ' + _domain;
                        };
                        eslConn.show('channels' + _item, 'json', function (err, parsed, data) {
                            var _res= {};
                            if (err) {
                                _res['body'] = '-ERR'
                            } else {
                                _res['body'] = data;
                            };
                            getCommandResponseJSON(ws, execId, _res);
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

var doSendFreeSWITCHCommand = function (id, socket) {
    if (!eslConn['authed']) {
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