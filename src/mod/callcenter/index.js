var CC = require('./callcenter'),
    WebitelCommandTypes = require('../../consts').WebitelCommandTypes,
    cc,
    HashCollection = require('../../lib/HashCollection'),
    handleSocketError = require('../../middleware/handleSocketError'),
    log = require('../../lib/log')(module);

try {
    Users.on('removed', function (evt) {
        try {
            if (evt['id'] && evt['cc-logged']) {
                cc.logoutUser(evt, function (res) {
                    log.trace((res && res['body'] && res.body.indexOf('+OK') === 0)
                        ? "Success logout cc " +  evt['id']
                        : "Error: " + (res['body'] || '').trim());
                });
            };
        } catch (e){
            log.error(e['message']);
        };
    });

    commandEmitter.on('sys::esl_create', function () {
        if (cc)
            delete cc;
        cc = new CC(eslConn);
    });
    
    commandEmitter.on('wss::' + WebitelCommandTypes.CallCenter.Ready.name, function (execId, args, ws) {
        var _caller = doSendCCCommand(execId, ws, WebitelCommandTypes.CallCenter.Ready);
        if (!_caller) return;
        cc.readyAgent(_caller, {status: args['status']}, function(res) {
            getCommandResponseJSON(ws, execId, res);
        });
    });

    commandEmitter.on('wss::' + WebitelCommandTypes.CallCenter.Busy.name, function (execId, args, ws) {
        var _caller = doSendCCCommand(execId, ws, WebitelCommandTypes.CallCenter.Busy);
        if (!_caller) return;
        cc.busyAgent(_caller, {state: args['state']}, function(res) {
            getCommandResponseJSON(ws, execId, res);
        });
    });


    // TODO add logount cc
    commandEmitter.on('wss::' + WebitelCommandTypes.CallCenter.Login.name, function (execId, args, ws) {
        var _caller = doSendCCCommand(execId, ws, WebitelCommandTypes.CallCenter.Login);
        if (!_caller) return;
        cc.loginAgent(_caller, {status: args['status']}, function(res) {
            getCommandResponseJSON(ws, execId, res);
        });
    });

    commandEmitter.on('wss::' + WebitelCommandTypes.CallCenter.Tier.List.name, function (execId, args, ws) {
        var _caller = doSendCCCommand(execId, ws, WebitelCommandTypes.CallCenter.Tier.List.perm);
        if (!_caller) return;

        var tiers = cc.tiersCollection.get(_caller.id),
            res = [];

        if (tiers && tiers.length() > 0) {
            var keys = tiers.getKeys();
            for (var key in keys) {
                res.push(tiers.get(keys[key]));
            };
        };

        try {
            if (res['body'] instanceof Object)
                res['body'] = JSON.stringify(res['body']);
            ws.send(JSON.stringify({
                'exec-uuid': execId,
                'exec-complete': "+OK",
                'exec-response': {'response': res}
            }));
        } catch (e) {
            //handleSocketError(_ws);
            log.warn('Error send response');
        };

        //getCommandResponseV2JSON(ws, execId, {
        //    "body": res
        //});
    });

    moduleEventEmitter.on('cc::TIER_CREATE', function (e) {
        var agentId = e['agent'] + '@' + e['domain'];
        var queueId = e['queue'] + '@' + e['domain'];

        var _tier = cc.tiersCollection.get(agentId);
        if (!_tier) {
            _tier = cc.tiersCollection.add(agentId, new HashCollection('id'));
        };

        _tier.add(queueId, {
            "agent": agentId,
            "level": 1,
            "position": 1,
            "queue": queueId,
            "state": "Ready"
        });
        log.debug('Add tiers hash id: %s, queue: %s', agentId, queueId);
    });

    moduleEventEmitter.on('cc::TIER_REMOVE', function (e) {
        var agentId = e['agent'] + '@' + e['domain'];
        var queueId = e['queue'] + '@' + e['domain'];

        var _tier = cc.tiersCollection.get(agentId);
        if (_tier) {
            _tier.remove(queueId);
            log.debug('Remove tiers hash id: %s, queue: %s', agentId, queueId);
        };
    });

} catch (e) {
   log.error(e['message']);
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

var getCommandResponseV2JSON = function (_ws, id, res) {
    try {
        if (res['body'] instanceof Object)
            res['body'] = JSON.stringify(res['body']);
        _ws.send(JSON.stringify({
            'exec-uuid': id,
            'exec-complete': (res['body'].indexOf('-ERR') == 0 || res['body'].indexOf('-USAGE') == 0) ? "-ERR" : "+OK",
            'exec-response': res['body']
        }));
    } catch (e) {
        handleSocketError(_ws);
        log.warn('Error send response');
    };
};

var doSendCCCommand = function (id, socket, command) {
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
    } else if (!cc) {
        try {
            socket.send(JSON.stringify({
                'exec-uuid': id,
                'exec-complete': '+ERR',
                'exec-response': {
                    'response': 'CC connect error.'
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
