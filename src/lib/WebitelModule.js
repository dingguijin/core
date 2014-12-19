var net = require('net');
var log = require('./log')(module);
var Parser = require('./Parser');


// GENERAL CONSTANTS
var ConnectionStatus = {
    Connected: 1,
    Disconnected: 2
};

var WebitelCommandResponseTypes = {
    Success: 0,
    Fail: 1
};

var WebitelErrorTypes = {
    Call: 'CALL-ERROR',
    Authentication: 'AUTH-ERROR',
    Agent: 'AGENT-ERROR',
    Connection: 'CONNECTION-ERROR',
    Command: 'COMMAND-ERROR',
    Event: 'EVENT-ERROR'
};



// Webitel = function(host, user, password, domain) {
module.exports = function(parameters) {
    var host = parameters['server'];
    var port = parameters['port'];
    var account = parameters['account'];
    var secret = parameters['secret'];
    var debug = parameters['debug'];
    var reconnect = parameters['reconnect'] || -1;

    var s4 = function() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    var guid = function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    //EVENTS
    var WebitelEvent = function() {
        var nextSubscriberId = 0;
        var subscriberList = [];

        this.subscribe = function(callback) {
            var id = nextSubscriberId;
            subscriberList[id] = callback;
            nextSubscriberId++;
            return id;
        };

        this.unsubscribe = function(id) {
            delete subscriberList[id];
        };

        this.trigger = function(sender) {
            for (var i in subscriberList) {
                subscriberList[i](sender);
            }
        };
    };

    // ==================================== Constants ==================================================

    var WebitelCommandTypes = {
        Auth: 'auth',
        Login: 'login',
        Logout: 'logout',
        AgentList: 'api account_list',
        CahangeStatus: 'state',
        Rawapi: 'rawapi',
        Event: 'event',
        NixEvent: 'nixevent',
        Domain: {
            List: 'api domain list',
            Create: 'api domain create',
            Remove: 'api domain remove'
        },
        Account: {
            List: 'api account list', //
            Create: 'api account create',
            Change: 'api account change',
            Remove: 'api account remove'
        },
        Device: {
            List: 'api device list',
            Create: 'api device create',
            Change: 'api device change',
            Remove: 'api device remove'
        },
        ListUsers: 'api list_users',
        Whoami: 'api whoami',
        ReloadAgents: 'favbet reload agents'
    };

    var version = '3.0.1';

    var WebitelServerContentTypes = {
        AuthRequest: 'auth/request',
        CommandReply: 'command/reply',
        ApiResponse: 'api/response',
        DisconnectNotice: 'disconnect/notice',
        TextPlain: 'text/plain',
        EventJson: 'text/event-json',
        EventPlain: 'text/event-plain',
        EventXml: 'text/event-xml'
    };

    var OnWebitelError = new WebitelEvent();

    var WebitelError = function(errorType, message) {
        this.getJSONObject = function() {
            return {
                errorType: errorType,
                message: message
            }
        }
    };

    var WebitelArrayQuery = function () {
        var query = new Array();

        var onAddedElement = new WebitelEvent();
        var onRemovedElement = new WebitelEvent();

        var addElement = function(element) {
            query.push(element);
            onAddedElement.trigger(element);
        };

        var removeElement = function() {
            query.shift();
            onRemovedElement.trigger();
        };

        var removeAllElement = function() {
            query.length = 0;
        };

        var getElement = function() {
            return query[0];
        };

        var getLength = function () {
            return query.length;
        };

        return {
            add: addElement,
            get: getElement,
            remove: removeElement,
            removeAll: removeAllElement,
            onAdded: onAddedElement,
            onRemoved: onRemovedElement,
            length: getLength,
            query: query
        };
    };

    var OngoingCommands = new WebitelArrayQuery();

    var WebitelCommand = function(commandName, params, callback) {
        var that = this
            ,command = [];

        this.id = guid();
        this.commandName = commandName;
        this.params = params;
        this.callback = callback;

        this.responseText = '';

        command.push(commandName);
        for (var key in params) {
            command.push(params[key])
        };

        command.push('\n\n');

        this.execute = function() {
            var wc = WebitelConnection;
            if (wc._status == ConnectionStatus.Connected) {
                if (debug) log.info('Command to execute: ' + command.join(' '));

                OngoingCommands.add(that);
                wc._webSocket.write(command.join(' '));
            };
        };
    };

    var WebitelServerEvent = function(attrs) {
        log.warn(attrs);
    };

    var WebitelCommandResponse = function(response) {
        this.type = response['Content-Type'];
        if (this.type === WebitelServerContentTypes.CommandReply) {
            this.status = response['exec-complete'] != "+OK" ? "-ERR" : "+OK";
            this.body = response['_body'] || response['Reply-Text'];
        } else {
            var pttnFailed = new RegExp("^(\-ERR|\-USAGE\:|NO|false) ");
            this.status = pttnFailed.test(response['_body']) ? "-ERR" : "+OK";
            this.body = response['_body'];
        }
    };

    var WebitelDisconnectNoticeResponse = function(response) {
        this.type = response['Content-Type'];
        this.reason = response['Close-Reason'];
        this.response = response['_body'];
    };

    //====================================================================

    //Functions related to connection
    var WebitelConnection = {
        _status: ConnectionStatus.Disconnected,
        getSocketStatus: function() {
            return WebitelConnection._status;
        },
        _webSocket: null,
        onConnect: new WebitelEvent(),
        onReceivedMessage: new WebitelEvent(),
        onDisconnect: new WebitelEvent(),
        parseCurrentAccount: function (responseStr) {
            var response = responseStr.replace('+OK ','');
            var roleIndex = response.indexOf('::');
            var login = response.substring(roleIndex + 2, response.length).split('@');
            return {
                role: response.substring(0, roleIndex),
                login: login[0],
                domain: login[1]
            };
        },
        connect: function() {
            var that = WebitelConnection;
            if (!host || host == '') {
                that.onDisconnect.trigger(new WebitelError(WebitelErrorTypes.Connection, 'Incorrect connection string.').getJSONObject());
                return;
            };
            log.info("Host: " + host);
            try {
                that._webSocket = net.connect({
                    port: port,
                    host: host
                }, function () {
                    log.info('WebSocket connection opened');
                    that._parser = new Parser(that._webSocket);
                    that._parser.on('webitel::event', function (event) {
                        try {
                            that.onReceivedMessage.trigger(JSON.parse(event.serialize('json')));
                        } catch (e) {
                            log.error('Error parse: ', e);
                        }
                    });
                    that._parser.on('error', function (e) {
                        log.error('Error:', e);
                    });
                    that._status = ConnectionStatus.Connected;
                    var authCommand = new WebitelCommand(WebitelCommandTypes.Auth, {
                            'account': account,
                            'secret': secret
                        },
                        function(res) {
                            //TODO
                            var wEv = new WebitelCommand('event json all', {}, function () {
                                log.warn('+OK events.');
                            });
                            wEv.execute();
                            if (res.status === WebitelCommandResponseTypes.Success) {
                                var user;
                                if (res.response) {
                                    user = that.parseCurrentAccount(res.response);
                                };

                                that.onConnect.trigger(user);
                            } else {
                                that.onDisconnect.trigger(res.response);
                            };
                        });
                    authCommand.execute();
                });
                that._webSocket.on('disconnect', function (e) {
                    log.error('Disconnect: ', e);
                });
                that._webSocket.on('error', function (e) {
                    setTimeout(that.connect, 1000);
                    log.error('Webitel server error: ', e);
                });
                that._webSocket.on('close', function () {
                    log.error('Webitel server close:', arguments);
                })
            } catch (e) {
                OnWebitelError.trigger(new WebitelError(WebitelErrorTypes.Connection, e.message).getJSONObject());
            };
        },
        // System Commands
        createDomain: function(name, customerId, cb) {
            var command = new WebitelCommand(WebitelCommandTypes.Domain.Create, {
                name: '\"' + name + '\"',
                customerId: customerId
            }, cb);
            command.execute();
        },
        listDomain: function(customerId, cb) {
            var _cb, _customerId;
            if (typeof arguments[0] == "function") {
                _cb = arguments[0];
                _customerId = null
            } else {
                _cb = cb;
                _customerId = customerId;
            };
            var command = new WebitelCommand(WebitelCommandTypes.Domain.List, {
                customerId: _customerId
            }, _cb);
            command.execute();
        },
        removeDomain: function(name, cb) {
            var command = new WebitelCommand(WebitelCommandTypes.Domain.Remove, {
                name: name
            }, cb);
            command.execute();
        },
        updateDomain: function() {
            // TODO
        },
        /*
         *  Список всех пользователей и устройств
         *  @domain {String}
         */
        list_users: function(domain, cb) {
            var _cb, _domain;
            if (typeof arguments[0] == "function") {
                _cb = arguments[0];
                _domain = null
            } else {
                _cb = cb;
                _domain = domain;
            };

            var cmd = new WebitelCommand(WebitelCommandTypes.ListUsers, {
                param: _domain
            }, _cb);
            cmd.execute();
        },
        /*
         @domain
         */
        listUser: function(domain, cb) {
            var _cb, _domain;
            if (typeof arguments[0] == "function") {
                _cb = arguments[0];
                _domain = null
            } else {
                _cb = cb;
                _domain = domain;
            };

            var cmd = new WebitelCommand(WebitelCommandTypes.Account.List, {
                param: _domain
            }, _cb);
            cmd.execute();
        },
        /*
         @role {String}
         <user>[:<password>][@<domain>]
         */
        createUser: function(role, _param, cb) {

            var cmd = new WebitelCommand(WebitelCommandTypes.Account.Create, {
                role: role,
                param: _param
            }, cb);
            cmd.execute();
        },
        /*
         <user>[@<domain>]
         <param> {user, password, role}
         <value>
         */
        updateUser: function(user, paramName, paramValue, cb) {
            var cmd = new WebitelCommand(WebitelCommandTypes.Account.Change, {
                user: user,
                param: paramName,
                value: paramValue
            }, cb);
            cmd.execute();
        },
        /*
         <user>[@<domain>]
         */
        removeUser: function(user, cb) {
            var cmd = new WebitelCommand(WebitelCommandTypes.Account.Remove, {
                user: user
            }, cb);
            cmd.execute();
        },

        // ----------------------- Device --------------------------------
        /*
         @domain
         */
        listDevice: function(domain, cb) {
            var _cb, _domain;
            if (typeof arguments[0] == "function") {
                _cb = arguments[0];
                _domain = null
            } else {
                _cb = cb;
                _domain = domain;
            };

            var cmd = new WebitelCommand(WebitelCommandTypes.Device.List, {
                param: _domain
            }, _cb);
            cmd.execute();
        },
        /*
         @role {String}
         <user>[:<password>][@<domain>]
         */
        createDevice: function(type, param, cb) {
            var cmd = new WebitelCommand(WebitelCommandTypes.Device.Create, {
                type: type,
                param: param
            }, cb);
            cmd.execute();
        },
        /*
         <user>[@<domain>]
         <param> {user, password, role}
         <value>
         */
        updateDevice: function(device, paramName, paramValue, cb) {
            var cmd = new WebitelCommand(WebitelCommandTypes.Device.Change, {
                device: device,
                param: paramName,
                value: paramValue
            }, cb);
            cmd.execute();
        },
        /*
         <user>[@<domain>]
         */
        removeDevice: function(device, cb) {
            var cmd = new WebitelCommand(WebitelCommandTypes.Device.Remove, {
                device: device
            }, cb);
            cmd.execute();
        },

        whoami: function (cb) {
            var that = WebitelConnection;
            var cmd = new WebitelCommand(WebitelCommandTypes.Whoami, {
            }, function (res) {
                if (res.status == WebitelCommandResponseTypes.Success) {
                    cb(that.parseCurrentAccount(res.response))
                };
            });
            cmd.execute();
        },

        reloadAgents: function (cb) {
            var command = new WebitelCommand(WebitelCommandTypes.ReloadAgents, {}, cb);
            command.execute();
        },
        // TODO FOR TEST
        sendMsgWebitel: function(commandsString, cb) {
            var command = new WebitelCommand(commandsString, {}, cb);
            command.execute();
        }
    };

    WebitelConnection.onReceivedMessage.subscribe(function(jsonResponse) {
        switch (jsonResponse['Content-Type']) {
            case WebitelServerContentTypes.AuthRequest:
                break;
            case WebitelServerContentTypes.ApiResponse:
            case WebitelServerContentTypes.CommandReply:
                var commandResponse = new WebitelCommandResponse(jsonResponse);

                var currentCommand = OngoingCommands.get();
                if (!currentCommand) {
                    log.error('Query command not found.');
                    return;
                };
                OngoingCommands.remove(currentCommand.id);
                if (currentCommand.callback) {
                    currentCommand.callback(commandResponse, jsonResponse);
                };
                log.info('Command ' + currentCommand.id + ' executed with result: ' + JSON.stringify(commandResponse));
                break;
            case WebitelServerContentTypes.DisconnectNotice:
                var disconnectResponse = new WebitelDisconnectNoticeResponse(jsonResponse);
                log.warn(disconnectResponse);
                break;
            case WebitelServerContentTypes.TextPlain:
                break;
            case WebitelServerContentTypes.EventJson:
            case WebitelServerContentTypes.EventPlain:
            case WebitelServerContentTypes.EventXml:
                WebitelServerEvent(jsonResponse);
                break;
        }
    });

    var resultInterface = {
        /**
         * Версия.
         */
        version: version,

        /**
         * Соедениться.
         */
        connect: WebitelConnection.connect,

        /**
         * Событие ошибки.
         * @param {WebitelError} - ошибка.
         **/
        onError: OnWebitelError.subscribe,

        // System API
        /*
         * Создать домен.
         * @domainName {String} - домен.
         * @customerId {String} - CustomerId.
         * @callback {Function} - callback Функция обратного вызова.
         */
        domainCreate: WebitelConnection.createDomain,

        /*
         * Получить список доменов.
         * @domainName {String} - домен (если не задан, список всех доменов).
         * @callback {Function} - callback Функция обратного вызова.
         */
        domainList: WebitelConnection.listDomain,

        /*
         * Удалить домен.
         * @domainName {String} - домен.
         * @callback {Function} - callback Функция обратного вызова.
         */
        domainRemove: WebitelConnection.removeDomain,

        // TODO
        domainUpdate: WebitelConnection.updateDomain,

        /*
         * Список всех устройств и пользователей.
         * @domain {String} - обязательный для Root пользователя, домен по которому получить список.
         * @cb {Function} - callback Функция обратного вызова.
         */
        list_users: WebitelConnection.list_users,

        /*
         * Список пользователей
         * @domain {String} - обязательный для Root пользователя, домен по которому получить список.
         * @cb {Function} - callback Функция обратного вызова.
         */
        userList: WebitelConnection.listUser,

        /*
         * Создать пользователя.
         * @role {WebitelUserRoleType} - роль пользователя.
         * @login {String} - логин(номер) - пользователя.
         * @password {String} - пароль пользователя.
         * @domain {String} - домен пользователя.
         * @cb {Function} - callback Функция обратного вызова.
         */
        userCreate: WebitelConnection.createUser,

        /*
         * Обновить параметр пользователя.
         * @user {String} - пользователь которому нужно сменить значение параметра.
         * @domain {String} - обязательный для Root пользователя, домен пользователя которого нужно обновить.
         * @paramName {WebitelUserParamType} - название параметра который нужно сменить.
         * @paramValue {String} - значение параметра.
         * @callback {Function} - callback Функция обратного вызова.
         */
        userUpdate: WebitelConnection.updateUser,

        /*
         * Удалить пользователя.
         * @user {String} - пользователь которого нужно удалить.
         * @domain {String} - обязательный для Root пользователя, домен пользователя которого нужно удалить.
         * @cb {Function} - callback Функция обратного вызова.
         */
        userRemove: WebitelConnection.removeUser,

        /*
         * Список устройств.
         * @domain {String} - домен по которому получить список.
         * @cb {Function} - callback Функция обратного вызова.
         */
        deviceList: WebitelConnection.listDevice,

        /*
         * Создать устройство.
         * @type {WebitelDeviceType} - тип устройства.
         * @login {String} - логин(номер) - устройства.
         * @password {String} - пароль устройства.
         * @domain {String} - домен устройства.
         * @cb {Function} - callback Функция обратного вызова.
         */
        deviceCreate: WebitelConnection.createDevice,

        /*
         * Обновить параметр устройства.
         * @device {String} - устройство которому нужно сменить значение параметра.
         * @domain {String} - домен устройства которое нужно обновить.
         * @paramName {WebitelUserParamType} - название параметра который нужно сменить.
         * @paramValue {String} - значение параметра.
         * @callback {Function} - callback Функция обратного вызова.
         */
        deviceUpdate: WebitelConnection.updateDevice,

        /*
         * Удалить устройство.
         * @device {String} - устройство которое нужно удалить.
         * @domain {String} - домен устройствaа которое нужно удалить.
         * @cb {Function} - callback Функция обратного вызова.
         */
        deviceRemove: WebitelConnection.removeDevice,

        /*
         * Информация про текущего пользователя.
         * @callback {Function} - callback Функция обратного вызова.
         */
        whoami: WebitelConnection.whoami,
        socketStatus: WebitelConnection.getSocketStatus,
        sendMsgWebitel: WebitelConnection.sendMsgWebitel,
        reloadAgents: WebitelConnection.reloadAgents
    };

    return resultInterface;
};
