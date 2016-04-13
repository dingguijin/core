/**
 * Created by i.navrotskyj on 10.04.2015.
 */

var WebitelCommandTypes = require('../consts').WebitelCommandTypes,
    log = require('../lib/log')(module),
    handleSocketError = require('../middleware/handleSocketError');

commandEmitter.on('wss::' + WebitelCommandTypes.Call.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    var _originatorParam = new Array('w_jsclient_originate_number=' + args['extension'], "rtp_secure_media=" + args['secure_media'] == 'true' ? 'true': 'false'),
        _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

    eslConn.bgapi(('originate ' + _param + 'user/' + args['user'] + ' ' + args['extension'] +
    ' xml default ' + args['user'] + ' ' + args['user']), function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.AttendedTransfer.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    var _originatorParam = new Array('w_jsclient_originate_number=' + args['destination'],
        'w_jsclient_xtransfer=' + args['call_uuid'], 'webitel_direction=outbound');
    if (args['is_webrtc']) {
        _originatorParam.push('sip_h_Call-Info=answer-after=1');
    };
    var _autoAnswerParam = [].concat( args['auto_answer_param'] || []),
        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

    eslConn.bgapi(('originate ' + _param + 'user/' + args['user'] + ' ' + args['destination'] +
    ' xml default ' + args['user'] + ' ' + args['user']), function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Transfer.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_transfer ' + args['channel-uuid'] + ' ' +
    args['destination'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Bridge.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_bridge ' + args['channel_uuid_A'] + ' ' + args['channel_uuid_B'], function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.VideoRefresh.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_video_refresh ' + args['uuid'], function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Hangup.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_kill ' + args['channel-uuid']  + ' ' + (args['cause'] || ''), function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.ToggleHold.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_hold toggle ' + args['channel-uuid'], function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Hold.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi(('uuid_hold ' + args['channel-uuid']), function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.UnHold.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi(('uuid_hold off ' + args['channel-uuid']), function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Dtmf.name, function (execId, args, ws) {
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
});

commandEmitter.on('wss::' + WebitelCommandTypes.Broadcast.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi(('uuid_broadcast ' + args['application']), function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.AttXfer.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    var _account = args['user'].split('@')[0];
    eslConn.bgapi(('uuid_broadcast ' + args['channel-uuid'] + ' att_xfer::{origination_cancel_key=#,origination_caller_id_name=' +
    _account + ',origination_caller_id_number=' + _account +
    ',webitel_att_xfer=true}user/' + args['destination'] + ''), function (res) {
        getCommandResponseJSON(ws, execId, res)
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.AttXfer2.name, function (execId, args, ws) {
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
});

commandEmitter.on('wss::' + WebitelCommandTypes.AttXferBridge.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_setvar ' + args['channel-uuid-leg-d'] + ' w_transfer_result confirmed');
    eslConn.bgapi('uuid_setvar ' + args['channel-uuid-leg-a'] + ' w_transfer_result confirmed');
    eslConn.bgapi('uuid_bridge ' + args['channel-uuid-leg-b'] + ' ' + args['channel-uuid-leg-c'], function (res) {
        if ( ~(res.body|| '').indexOf('-ERR')) {
            eslConn.bgapi('uuid_setvar ' + args['channel-uuid-leg-d'] + ' w_transfer_result error');
            eslConn.bgapi('uuid_setvar ' + args['channel-uuid-leg-a'] + ' w_transfer_result error');
        }
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.AttXferCancel.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_kill ' + args['channel-uuid-leg-c'] + ' ' + (args['cause'] || ''), function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Dump.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_dump ' + args['uuid'] + ' json', function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.GetVar.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_getvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' +
    (args['inleg'] || ''), function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.SetVar.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('uuid_setvar ' + args['channel-uuid'] + ' ' + args['variable'] + ' ' + args['value'] + ' ' +
    (args['inleg'] || ''), function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Eavesdrop.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    eslConn.bgapi('originate user/' + (args['user'] || '') + ' &eavesdrop(' + (args['channel-uuid'] || '') +
    ') XML default ' + args['side'] + ' ' + args['side'], function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});

commandEmitter.on('wss::' + WebitelCommandTypes.Displace.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    var _play = args['record'] == 'start'
        ? 'start'
        : 'stop';
    _play += ' silence_stream://0 3';
    eslConn.bgapi('uuid_displace ' + args['channel-uuid'] + ' ' + _play, function (res) {
        getCommandResponseJSON(ws, execId, res);
    });
});
//+
commandEmitter.on('wss::' + WebitelCommandTypes.Gateway.Kill.name, function (execId, args, ws) {
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
});
//+
commandEmitter.on('wss::' + WebitelCommandTypes.SipProfile.List.name, function (execId, args, ws) {
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
});
//+
commandEmitter.on('wss::' + WebitelCommandTypes.SipProfile.Rescan.name, function (execId, args, ws) {
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
});
//+
commandEmitter.on('wss::' + WebitelCommandTypes.Show.Channel.name, function (execId, args, ws) {
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
});
//+
commandEmitter.on('wss::' + WebitelCommandTypes.Chat.Send.name, function (execId, args, ws) {
    if (!doSendFreeSWITCHCommand(execId, ws)) return;
    try {
        var profile = args['profile'] || 'verto';
        var from = ws['upgradeReq']['webitelId'];
        var to = args['to'];
        var message = args['message'];

        if (!from || !to || !message){
            getCommandResponseJSON(ws, execId, {
                "body": "-ERR Bad request"
            });
            return;
        };

        var data = [].concat(profile, from, to, message).join('|');
        eslConn.bgapi('chat ' + data, function (res) {
            getCommandResponseJSON(ws, execId, res)
        });

    } catch (e) {
        log.error(e['message']);
    };
});

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
