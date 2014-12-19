var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    Parser = require('./Parser'),
    log = require('./log')(module),
    net = require('net');

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
    log.info("Host: " + this.host);
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
            _command.push(args[key])
        };
        log.info('Execute: ' + _command.join(' '));
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
                log.info(res.getHeader('Reply-Text'));
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

Webitel.prototype.domainCreate = function(name, customerId, cb) {
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

Webitel.prototype.domainList = function(customerId, cb) {
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

Webitel.prototype.domainRemove = function(name, cb) {
    this.api(WebitelCommandTypes.Domain.Remove, [
        name || ''
    ], cb);
    /*var command = new WebitelCommand(WebitelCommandTypes.Domain.Remove, {
        name: name
    }, cb);
    command.execute(); */
};

Webitel.prototype.updateDomain = function() {
    // TODO
};

Webitel.prototype.list_users = function(domain, cb) {
    var _cb,
        _domain,
        self = this;
    if (typeof arguments[0] == "function") {
        _cb = arguments[0];
        _domain = null
    } else {
        _cb = cb;
        _domain = domain;
    };
    this.api(WebitelCommandTypes.ListUsers,
        [
                _domain || ''
        ],
        _cb
    );
    /* FAVBET
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
            }
            _cb({
                body: JSON.stringify(resJSON)
            })
        });
    });
    */
    /*var cmd = new WebitelCommand(WebitelCommandTypes.ListUsers, {
        param: _domain
    }, _cb);
    cmd.execute();*/
};

Webitel.prototype.userList = function(domain, cb) {
    var _cb, _domain;
    if (typeof arguments[0] == "function") {
        _cb = arguments[0];
        _domain = null
    } else {
        _cb = cb;
        _domain = domain;
    };
    this.api(WebitelCommandTypes.Account.List, [
        _domain
    ], _cb);
/*
    var cmd = new WebitelCommand(WebitelCommandTypes.Account.List, {
        param: _domain
    }, _cb);
    cmd.execute();*/
};

Webitel.prototype.userCreate = function(role, _param, cb) {
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

Webitel.prototype.userUpdate = function(user, paramName, paramValue, cb) {
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

Webitel.prototype.userRemove = function(user, cb) {
    this.api(WebitelCommandTypes.Account.Remove, [
            user || ''
    ], cb);
    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Account.Remove, {
        user: user
    }, cb);
    cmd.execute();*/
};

Webitel.prototype.deviceList = function(domain, cb) {
    var _cb, _domain;
    if (typeof arguments[0] == "function") {
        _cb = arguments[0];
        _domain = null
    } else {
        _cb = cb;
        _domain = domain;
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

Webitel.prototype.deviceCreate = function(type, param, cb) {
    this.api(WebitelCommandTypes.Device.Create, [
            type || '',
            param || ''
    ], cb);

    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.Create, {
        type: type,
        param: param
    }, cb);
    cmd.execute(); */
};

Webitel.prototype.deviceUpdate = function(device, paramName, paramValue, cb) {
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

Webitel.prototype.deviceRemove = function(device, cb) {
    this.api(WebitelCommandTypes.Device.Remove, [
            device || ''
    ], cb);

    /*
    var cmd = new WebitelCommand(WebitelCommandTypes.Device.Remove, {
        device: device
    }, cb);
    cmd.execute();*/
};

Webitel.prototype.whoami = function (cb) {
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

Webitel.prototype.reloadAgents = function (cb) {
    this.api(WebitelCommandTypes.ReloadAgents, cb);
    /*
    var command = new WebitelCommand(WebitelCommandTypes.ReloadAgents, {}, cb);
    command.execute();*/
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
    ReloadAgents: 'favbet reload agents'
};
/* FAVBET */
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
            _json = {};

        _line = data.split('\n');
        _head = _line[0].split('\t');
        for (var i = 2; i < _line.length && _line[i] != const_DataSeparator; i++) {
            _line[i].split('\t').reduce(function (_json, line, index) {
                if (index == 0) {
                    _json[i] = {
                        id: line.trim()
                    };
                } else {
                    if (_head[index] === 'online') {
                        _json[i][_head[index].trim()] = (Users.get(_json[i]['id'] + '@' + domain)
                            ? "true"
                            : "false");
                    } else {
                        _json[i][_head[index].trim()] = line.trim();
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
/* ENDFAVBET */