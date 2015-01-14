var HashCollection = require('../lib/HashCollection'),
    log = require('../lib/log')(module),
    Domains = global.Domains = new HashCollection('id'),
    Users = global.Users = new HashCollection('id'),
    handleSocketError = require('../middleware/handleSocketError'),
    ACCOUNT_EVENTS = require('../consts').ACCOUNT_EVENTS;

Domains.broadcast = function (domainName, event) {
    if (!domainName || !event) return;
    var _domain,
        _usersKeys,
        _userWS,
        _user;
    try {
        _domain = this.get(domainName);
        if (_domain && _domain['users']) {
            _usersKeys = _domain['users'];
            for (var key in _usersKeys) {
                try {
                    _user = Users.get(_usersKeys[key]);
                    if (!_user) continue;
                    _userWS = _user['ws'];
                    if(_userWS instanceof Array) {
                        _userWS.forEach(function (_ws) {
                            try {
                                _ws.send(event);
                            } catch (e) {
                                handleSocketError(_ws);
                                log.warn('Error send response:', e.message);
                            }
                        });
                    }
                } catch (e) {
                    log.error(e.message);
                }
            }
        }
    } catch (e) {
        log.error(e.message);
    }
};

Users.on('added', function (evn) {
    try {
        var _id = evn.id.split('@'),
            _domain = _id[1] || _id[0],
            domain = Domains.get(_domain),
            jsonEvent;
        /* TODO сделано для стаусов
        try {
            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.ONLINE, _domain, _id[0]);
            log.info(jsonEvent['Event-Name'] + ' -> ' + evn.id);
            Domains.broadcast(_domain, JSON.stringify(jsonEvent));
        } catch (e) {
            log.warn('Broadcast account event: ', domain);
        }
        */
        if (!domain) {
            Domains.add(_domain, {
                id: _domain,
                users: [evn.id]
            });
            log.debug('Domains session: ', Domains.length());
        } else {
            if (domain.users.indexOf(evn.id) == -1) {
                domain.users.push(evn.id);
            };
        };
    } catch (e) {
        log.warn('On add domain error: ', e.message);
    }
});

Users.on('removed', function (evn) {
    try {
        var _id = evn.id.split('@'),
            _domain = _id[1] || _id[0],
            domain = Domains.get(_domain),
            jsonEvent;
        /* TODO сделано для стаусов
        try {
            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.OFFLINE, _domain, _id[0]);
            log.debug(jsonEvent['Event-Name'] + ' -> ' + evn.id);
            Domains.broadcast(_domain, JSON.stringify(jsonEvent));
        } catch (e) {
            log.warn('Broadcast account event: ', domain);
        };
        */
        if (domain) {
            var _index = domain.users.indexOf(evn.id);
            if (_index != -1) {
                domain.users.splice(_index, 1);
                if (domain.users.length == 0) {
                    Domains.remove(_domain);
                    log.debug('Domains session: ', Domains.length());
                };
            };
        };
    } catch (e) {
        log.warn('On remove domain error: ', e.message);
    }
});

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