var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    Parser = require('./Parser'),
    log = require('./log')(module),
    net = require('net'),
    PERMISSION_DENIED = '-ERR permission denied!',
    ACCOUNT_ROLE = require('../consts').ACCOUNT_ROLE,
    COMMAND_TYPES = require('../consts').WebitelCommandTypes;

var Webitel = module.exports = function (parameters) {
    EventEmitter2.call(this, {
        wildcard: true,
        delimiter: '::',
        maxListeners: 25
    });
    this.host = parameters['server'];
    this.port = parameters['port'];
    this.account = parameters['account'];
    this.password = parameters['secret'];
    this.authed = false;

    this.reconnect = parameters['reconnect'] || -1;
    this._status = ConnectionStatus.Disconnected;
    this.socket = null;
    this._parser = null;
    this.cmdCallbackQueue = [];
    this.apiCallbackQueue = [];
};

util.inherits(Webitel, EventEmitter2);

Webitel.prototype.version = '3.0.1';

Webitel.prototype.connect = function () {
    log.trace("Host: " + this.host);
    var self = this;
    // TODO нужно тестировать будет ли ответ когда упадет соединение
    this.cmdCallbackQueue.length = 0;
    this.apiCallbackQueue.length = 0;

    this.socket = net.connect({
        port: this.port,
        host: this.host
    }, this._onConnect.bind(this));

    this.socket.on('close', this._onSocketClose.bind(this));

    this.socket.on('error', this._onSocketError.bind(this));

    this.socket.on('end', function() {
        self._status = ConnectionStatus.Disconnected;
        self.emit('webitel::end');
        self.socket = null;
    });

    var self = this;

    this.on('webitel::event::command::reply', function() {
        if(self.cmdCallbackQueue.length === 0) return;

        var fn = self.cmdCallbackQueue.shift();

        if(fn && typeof fn === 'function')
            fn.apply(self, arguments);
    });

    this.on('webitel::event::api::response', function() {
        if(self.apiCallbackQueue.length === 0) return;

        var fn = self.apiCallbackQueue.shift();

        if(fn && typeof fn === 'function')
            fn.apply(self, arguments);
    });

};

Webitel.prototype._onSocketClose = function (err) {
    this.emit('webitel::socket::close', err);
};

Webitel.prototype.send = function(command, args) {
    var self = this;
    var _command = [];
    try {
        _command.push(command);
        for (var key in args) {
            _command.push(args[key]);
        };
        log.debug('Execute: ' + _command.join(' '));
        self.socket.write(_command.join(' ') + '\n\n');
    }
    catch(e) {
        self.emit('error', e);
    }
};

Webitel.prototype.sendRecv = function(command, args, cb) {
    if(typeof args === 'function') {
        cb = args;
        args = null;
    }

    //queue callback for command reply
    this.cmdCallbackQueue.push(cb);

    this.send(command, args);
};

Webitel.prototype._onError = function(err) {
    this.emit('error', err);
};

Webitel.prototype._onSocketError = function (err) {
    this.emit('error::socket', err);
};

Webitel.prototype._onConnect = function() {
    this.parser = new Parser(this.socket);

    this.parser.on('webitel::event', this._onEvent.bind(this));

    //on parser error
    this.parser.on('error', this._onError.bind(this));

    //emit that we conencted
    this.emit('webitel::connect');

    //wait for auth request
    this.on('webitel::event::auth::request', this.auth.bind(this));
};

Webitel.prototype.auth = function (cb) {
    var self = this;

    //send auth command
    self.sendRecv('auth ' + self.account + ' ' + self.password, function(evt) {
        if(evt.getHeader('Webitel-Reply-OK')) {
            self.authed = true;
            self._status = ConnectionStatus.Connected;
//            self.subscribe(self.reqEvents);

            self.emit('webitel::event::auth::success', evt);
            self.emit('webitel::ready');

            if(cb && typeof cb === 'function') cb(null, evt);
        } else {
            self._status = ConnectionStatus.Disconnected;
            self.authed = false;
            self.emit('webitel::event::auth::fail', evt);

            if(cb && typeof cb === 'function') cb(new Error('Authentication Failed'), evt);
        };
    });
};

Webitel.prototype.api = function (command, args, cb) {
    if(typeof args === 'function') {
        cb = args;
        args = '';
    }

    if(args instanceof Array)
        args = args.join(' ');

    args = (args ? ' ' + args : '');

    //queue callback for api response
    this.apiCallbackQueue.push(cb);

    this.send('api ' + command + args);
};

Webitel.prototype.subscribe = function (param) {
    try {
        this.sendRecv('event json ' + param, function (res) {
            if (res.getHeader('Webitel-Reply-OK')) {
                log.debug(res.getHeader('Reply-Text'));
            } else if (res.getHeader('Webitel-Reply-ERR')) {
                log.error(res.getHeader('Reply-Text'));
            } else {
                log.error('Subscribe Webitel error!');
            }
        });
    } catch (e) {
        log.error(e.message);
    }
};

Webitel.prototype._onEvent = function(event, headers, body) {
    var emit = 'webitel::event';

    switch(headers['Content-Type']) {
        case 'auth/request':
            emit += '::auth::request';
            break;

        case 'command/reply':
            emit += '::command::reply';
            break;

        case 'text/disconnect-notice':
            emit += '::disconnect::notice';
            break;

        case 'api/response':
            emit += '::api::response';
            break;

        case 'text/event-json':
        case 'text/event-plain':
        case 'text/event-xml':
            emit += '::event::' + event.getHeader('Event-Name');
            break;

        default:
            emit += '::raw::' + headers['Content-Type'];
    }

    this.emit(emit, event, headers, body);
};

var ConnectionStatus = {
    Connected: 1,
    Disconnected: 2
};

Webitel.prototype.domainCreate = function(_caller, name, customerId, cb) {
    this.api(WebitelCommandTypes.Domain.Create, [
        '\"' + name + '\"',
        customerId || ''
    ], cb);
    /*var command = new WebitelCommand(WebitelCommandTypes.Domain.Create, {
        name: '\"' + name + '\"',
        customerId: customerId
    }, cb);
    command.execute(); */
};

Webitel.prototype.domainList = function(_caller, customerId, cb) {
    var _cb, _customerId;
    if (typeof arguments[0] == "function") {
        _cb = arguments[0];
        _customerId = null
    } else {
        _cb = cb;
        _customerId = customerId;
    };
    this.api(WebitelCommandTypes.Domain.List, [
        _customerId
    ], _cb);
    /*
    var command = new WebitelCommand(WebitelCommandTypes.Domain.List, {
        customerId: _customerId
    }, _cb);
    command.execute();
    */
};

Webitel.prototype.domainRemove = function(_caller, name, cb) {
    this.api(WebitelCommandTypes.Domain.Remove, [
        name || ''
    ], cb);
    /*var command = new WebitelCommand(WebitelCommandTypes.Domain.Remove, {
        name: name
    }, cb);
    command.execute(); */
};

Webitel.prototype.updateDomain = function(_caller) {
    // TODO
};

Webitel.prototype.list_users = function(_caller, domain, cb, format) {
    var _cb,
        _domain,
        self = this;
    if (typeof arguments[1] == "function") {
        _cb = arguments[1];
        _domain = _caller['attr']['domain']
    } else {
        _cb = cb;
        _domain = domain || _caller['attr']['domain'];
    };

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.ListUsers.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    }
 /*   this.api(WebitelCommandTypes.ListUsers,
        [
                _domain || ''
        ],
        _cb
    ); */
    // Для ивентов, чтобы заполнить online
    this.api(WebitelCommandTypes.ListUsers, [
            _domain || ''
    ], function (res) {
        if (res['body'].indexOf('-ERR') == 0) {
            _cb(res);
            return;
        };
        self._parsePlainTableToJSON(res.getBody(), _domain, function (err, resJSON) {
            if (err) {
                log.error(err);
                _cb({
                    body: '-ERR ' + err.message
                });
                return;
            };
            if (format && format == 'json') {
                _cb({
                    body: resJSON
                });
                return;
            };
            _cb({
                body: JSON.stringify(resJSON)
            })
        });
    });

    /*var cmd = new WebitelCommand(WebitelCommandTypes.ListUsers, {
        param: _domain
    }, _cb);
    cmd.execute();*/
};

Webitel.prototype.userList = function(_caller, domain, cb) {
    var _cb, _domain,
        self = this;
    if (typeof arguments[1] == "function") {
        _cb = arguments[1];
        _domain = _caller['attr']['domain']
    } else {
        _cb = cb;
        _domain = domain || _caller['attr']['domain'];
    };

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Account.List.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    }
    /*this.api(WebitelCommandTypes.Account.List, [
        _domain
    ], _cb); */
    // для статусов
    this.api(WebitelCommandTypes.Account.List, [
            _domain || ''
    ], function (res) {
        if (res['body'].indexOf('-ERR') == 0) {
            _cb(res);
            return;
        };
        self._parsePlainTableToJSON(res.getBody(), _domain, function (err, resJSON) {
            if (err) {
                log.error(err);
                _cb({
                    body: '-ERR ' + err.message
                });
                return;
            }
            _cb({
                body: JSON.stringify(resJSON)
            })
        });
    });
/*
    var cmd = new WebitelCommand(WebitelCommandTypes.Account.List, {
        param: _domain
    }, _cb);
    cmd.execute();*/
};

Webitel.prototype.userCreate = function(_caller, role, _param, cb) {
    _param = _param || '';
    var _domain = _param.split('@')[1];

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Account.Create.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    }

    this.api(WebitelCommandTypes.Account.Create, [
        role || '',
        _param || ''
    ], cb);
   /* var cmd = new WebitelCommand(WebitelCommandTypes.Account.Create, {
        role: role,
        param: _param
    }, cb);
    cmd.execute(); */
};

Webitel.prototype.userUpdate = function(_caller, user, paramName, paramValue, cb) {
    var _domain = user.split('@')[1];

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Account.Change.perm ||
        ((_caller['attr']['domain'] != _domain || (_caller['attr']['role'].val == ACCOUNT_ROLE.USER.val &&
            user != _caller['id']))&& _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };

    if (paramName == 'role' && user == _caller['id']) {
        cb({
            body: '-ERR Woow! Slow down!' // (c) srg
        });
        return
    };

    this.api(WebitelCommandTypes.Account.Change, [
            user || '',
            paramName || '',
            paramValue || ''
    ], cb);
    /*var cmd = new WebitelCommand(WebitelCommandTypes.Account.Change, {
        user: user,
        param: paramName,
        value: paramValue
    }, cb);
    cmd.execute(); */
};

Webitel.prototype.userRemove = function(_caller, user, cb) {
    var _domain = user.split('@')[1];
    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Account.Remove.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };

    if (user == _caller['id']) {
        cb({
            body: "-ERR Easy! it's YOU !!!" // (c) srg
        });
        return
    };

    this.api(WebitelCommandTypes.Account.Remove, [
            user || ''
    ], cb);
    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Account.Remove, {
        user: user
    }, cb);
    cmd.execute();*/
};

Webitel.prototype.deviceList = function(_caller, domain, cb) {
    var _cb, _domain;
    if (typeof arguments[1] == "function") {
        _cb = arguments[1];
        _domain = null
    } else {
        _cb = cb;
        _domain = domain || _caller['attr']['domain'];
    };

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Device.List.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };

    this.api(WebitelCommandTypes.Device.List, [
            _domain || ''
    ], _cb);
    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.List, {
        param: _domain
    }, _cb);
    cmd.execute();*/
};

Webitel.prototype.deviceCreate = function(_caller, type, _param, cb) {
    _param = _param || '';
    var _domain = _param.split('@')[1];

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Device.Create.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    }
    this.api(WebitelCommandTypes.Device.Create, [
            type || type,
            _param
    ], cb);

    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.Create, {
        type: type,
        param: param
    }, cb);
    cmd.execute(); */
};

Webitel.prototype.deviceUpdate = function(_caller, device, paramName, paramValue, cb) {

    var _domain = device.split('@')[1];
    // TODO юзер можеть только себе параметры менять, админ в домене, рут у всех!!!!
    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Device.Change.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    this.api(WebitelCommandTypes.Device.Change, [
            device || '',
            paramName || '',
            paramValue || ''
    ], cb);

    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.Change, {
        device: device,
        param: paramName,
        value: paramValue
    }, cb);
    cmd.execute();*/
};

Webitel.prototype.deviceRemove = function(_caller, device, cb) {
    var _domain = device.split('@')[1];
    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Device.Remove.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    this.api(WebitelCommandTypes.Device.Remove, [
            device || ''
    ], cb);

    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.Remove, {
        device: device
    }, cb);
    cmd.execute();*/
};

Webitel.prototype.whoami = function (_caller, cb) {
    // TODO вернуть _caller
    this.api(WebitelCommandTypes.Whoami, cb);
   /* var that = WebitelConnection;
    var cmd = new WebitelCommand(WebitelCommandTypes.Whoami, {
    }, function (res) {
        if (res.status == WebitelCommandResponseTypes.Success) {
            cb(that.parseCurrentAccount(res.response))
        };
    });
    cmd.execute(); */
};

Webitel.prototype.reloadAgents = function (_caller, cb) {
    this.api(WebitelCommandTypes.ReloadAgents, cb);
    /*
    var command = new WebitelCommand(WebitelCommandTypes.ReloadAgents, {}, cb);
    command.execute();*/
};

Webitel.prototype.reloadXml = function (_caller, cb) {
    this.api(WebitelCommandTypes.ReloadXml, cb);
};

Webitel.prototype.showSipGateway = function (_caller, domain, cb) {
    // api sip_gateway
    var _cb, _domain;
    if (typeof arguments[1] == "function") {
        _cb = arguments[1];
        _domain = '';
    } else {
        _cb = cb;
        _domain = domain || _caller['attr']['domain'];
    };
    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Gateway.List.perm ||
        (_caller['attr']['domain'] != _domain && _caller['attr']['role'].val != ACCOUNT_ROLE.ROOT.val))) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    var _t = '';
    if (domain) {
        _t = '@' + domain
    }


    this.api(WebitelCommandTypes.Gateway.Index, [
        _t
    ], _cb);
};

Webitel.prototype.createSipGateway = function (_caller, gateway, cb) {
    if (typeof gateway !== 'object' || !gateway['name'] || typeof gateway['username'] !== 'string') {
        cb({
            'body': '-ERR Invalid arguments'
        });
        return;
    };

    if (!_caller || (_caller['attr']['role'].val < COMMAND_TYPES.Gateway.Create.perm )) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };

    var _domain = _caller['attr']['domain'] || gateway['domain'],
        _params = gateway['params'],
        _var = gateway['var'],
        _ivar = gateway['ivar'],
        _ovar = gateway['ovar'],
        _commandsLine = 'create ';

    if (_params instanceof Array) {
        _commandsLine = _commandsLine.concat('[');
        _commandsLine = parseArrayToCommandLine(_params, _commandsLine);
        _commandsLine = _commandsLine.concat(']');
    };

    _commandsLine = _commandsLine.concat('{');

    if (_var instanceof Array) {
        _commandsLine = parseArrayToCommandLine(_var, _commandsLine);
    };

    if (_ivar instanceof Array) {
        _commandsLine = parseArrayToCommandLine(_ivar, _commandsLine, 'inbound');
    };

    if (_ovar instanceof Array) {
        _commandsLine = parseArrayToCommandLine(_ovar, _commandsLine, 'outbound');
    };
    _commandsLine = _commandsLine.concat('}');

    if (typeof gateway['template'] == 'string' && gateway['template'] != '') {
        _commandsLine = _commandsLine.concat(gateway['template'], "::");
    };

    _commandsLine = _commandsLine.concat(gateway['name']);
    if (_domain) {
        _commandsLine = _commandsLine.concat('@',_domain);
    };
    _commandsLine = _commandsLine.concat(' ', gateway['username']);

    if (typeof gateway['password'] == 'string' && gateway['password'] != '') {
        _commandsLine = _commandsLine.concat(':', gateway['password']);
    };

    if (typeof gateway['realm'] == 'string' && gateway['realm'] != '') {
        _commandsLine = _commandsLine.concat('@', gateway['realm']);
    };

    if (typeof gateway['profile'] == 'string') {
        _commandsLine = _commandsLine.concat(' ', 'up external');
    };

    this.api(WebitelCommandTypes.Gateway.Index, [
        _commandsLine
    ], cb);
};

Webitel.prototype.changeSipGateway = function (_caller, gateway_id, type, params, cb) {
    if (!_caller || _caller['attr']['role'].val < COMMAND_TYPES.Gateway.Change.perm) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    var _cl = gateway_id + ' ';
    switch (type) {
        case WebitelGatevayTypeAttribute.VAR:
            _cl = _cl.concat(WebitelGatevayTypeAttribute.VAR);
            break;

        case WebitelGatevayTypeAttribute.IVAR:
            _cl = _cl.concat(WebitelGatevayTypeAttribute.IVAR);
            break;
        case WebitelGatevayTypeAttribute.OVAR:
            _cl = _cl.concat(WebitelGatevayTypeAttribute.OVAR);
            break;
    };

    if (params instanceof Array) {
        _cl = _cl.concat(' ');
        for (var i = 0, len = params.length; i < len; i++) {
            if (params[i]['name'])
                _cl = _cl.concat(params[i]['name'], '=');
            if (params[i]['value'])
                _cl = _cl.concat(params[i]['value']);
            _cl = _cl.concat(',');
        };
    };
    this.api(WebitelCommandTypes.Gateway.Index, [
        _cl
    ], cb);
};

Webitel.prototype.removeSipGateway = function (_caller, gateway_id, cb) {
    if (!_caller || _caller['attr']['role'].val < COMMAND_TYPES.Gateway.Remove.perm) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    this.api(WebitelCommandTypes.Gateway.Index, [
        'remove ' + gateway_id
    ], cb);
};

Webitel.prototype.upSipGateway = function (_caller, gateway_id, profile, cb) {
    if (!_caller || _caller['attr']['role'].val < COMMAND_TYPES.Gateway.Remove.perm) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };

    // TODO удалить external
    this.api(WebitelCommandTypes.Gateway.Index, [
        gateway_id + ' up ' + 'external'
    ], cb);
};

Webitel.prototype.downSipGateway = function (_caller, gateway_id, cb) {
    if (!_caller || _caller['attr']['role'].val < COMMAND_TYPES.Gateway.Remove.perm) {
        cb({
            body: PERMISSION_DENIED
        });
        return;
    };
    this.api(WebitelCommandTypes.Gateway.Index, [
        gateway_id + ' down'
    ], cb);
};


Webitel.prototype.userDara = function (userId, type, paramsArray, cb) {
    this.api(WebitelCommandTypes.UserData, [].concat(userId, type || 'global', paramsArray.join(','), 'as json'), cb);
};

function parseArrayToCommandLine (_arr, _cl, direction) {
    var _d = direction
        ? '[direction=' + direction + ']'
        : '';

    for (var i = 0, len = _arr.length; i < len; i++) {
        if (!_arr[i]['name']) continue;

        _cl = _cl.concat(_arr[i]['name'] + _d + '=');
        if (_arr[i]['value'] || typeof _arr[i]['value'] == "boolean")
            _cl = _cl.concat(_arr[i]['value']);
        _cl = _cl.concat(',');
    };
    return _cl;
};

var WebitelCommandTypes = {

// COMMANDS
    Auth: 'auth',
    Event: 'event',
    NixEvent: 'nixevent',

// API
    AgentList: 'account_list',
    Domain: {
        List: 'domain list',
        Create: 'domain create',
        Remove: 'domain remove'
    },
    Account: {
        List: 'account list', //
        Create: 'account create',
        Change: 'account change',
        Remove: 'account remove'
    },
    Device: {
        List: 'device list',
        Create: 'device create',
        Change: 'device change',
        Remove: 'device remove'
    },
    ListUsers: 'list_users',
    Whoami: 'whoami',
    ReloadXml: 'reloadxml',

    ReloadAgents: 'favbet reload agents',

    Gateway: {
        Index: "sip_gateway"
    },
    UserData: 'user_data'
};

var WebitelGatevayTypeAttribute = {
    PARAM: 'param',
    VAR: 'var',
    OVAR: 'ovar',
    IVAR: 'ivar'
};

Webitel.prototype.doSendCommand = function (res) {
    if (!webitel.authed) {
        try {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write("Error: Webitel server disconnect!");
            res.end();
            return false;
        } catch (e) {
            log.warn('Write message:', e.message);
            return false;
        };
    };
    return true;
};

Webitel.prototype.doSendCommandV2 = function (res) {
    if (!webitel.authed) {
        try {
            res.status(500).json({
                "status": "error",
                "info": "Error: Webitel server disconnect!"
            });
            return false;
        } catch (e) {
            log.warn('Write message:', e.message);
            return false;
        };
    };
    return true;
};

/* Parse table */
var const_DataSeparator = '=================================================================================================';
Webitel.prototype._parsePlainTableToJSON = function(data, domain, cb) {
    if (!data) {
        cb('Data is undefined!');
        return
    };
    try {
        domain = domain || '_undef_';
        var _line,
            _head,
            _json = {},
            _id,
            _user;

        _line = data.split('\n');
        _head = _line[0].split('\t');
        for (var i = 2; i < _line.length && _line[i] != const_DataSeparator; i++) {
            _id = '';
            _line[i].split('\t').reduce(function (_json, line, index) {
                if (index == 0) {
                    _id = line.trim(); // + '@' + domain;
                    _json[_id] = {
                        id: _id
                    };
                } else {
                    if (_head[index] === 'online') {
                        _user = Users.get(_json[_id]['id'] + '@' + domain);

                        _json[_id]['online'] = ((_user && _user.logged)
                            ? true
                            : false);
                    } else {
                        _json[_id][_head[index].trim()] = line.trim();
                    };
                };
                return _json;
            }, _json);
        };
        cb(null, _json);
    } catch (e) {
        cb(e);
    };
};
/*  */