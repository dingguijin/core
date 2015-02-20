var HashCollection = require('../lib/HashCollection'),
    log = require('../lib/log')(module),
    Domains = global.Domains = new HashCollection('id'),
    Users = global.Users = new HashCollection('id'),
    ACCOUNT_EVENTS = require('../consts').ACCOUNT_EVENTS,
    eventsCollection = require('./EventsCollection');


Domains.broadcast = function (domainName, event) {
    if (!domainName || !event) return;
    var _domain,
        _usersKeys,
        _user;
    try {
        _domain = this.get(domainName);
        if (_domain && _domain['users']) {
            _usersKeys = _domain['users'];
            for (var key in _usersKeys) {
                try {
                    _user = Users.get(_usersKeys[key]);
                    if (!_user) continue;
                    Users.sendObject(_user, event);
                } catch (e) {
                    log.error(e.message);
                }
            };
        };
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
        try {
            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.ONLINE, _domain, _id[0]);
            log.debug(jsonEvent['Event-Name'] + ' -> ' + evn.id);
            Domains.broadcast(_domain, jsonEvent);
        } catch (e) {
            log.warn('Broadcast account event: ', domain);
        }
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
        try {
            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.OFFLINE, _domain, _id[0]);
            log.debug(jsonEvent['Event-Name'] + ' -> ' + evn.id);
            Domains.broadcast(_domain, jsonEvent);
            eventsCollection.removeUserSubscribe(_id[0], _domain);
        } catch (e) {
            log.warn('Broadcast account event: ', domain);
        };
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

Users.sendObject = function (user, evObj) {
    if (!user || !user.ws || !evObj) {
        log.error("Send user error: bad parameters!");
        return;
    };
    for (var key = 0, len = user.ws.length; key < len; key++) {
        try {
            user.ws[key].send(JSON.stringify(evObj));
        } catch (e) {
            if (user.ws[key].readyState == user.ws[key].CLOSED) {
                user.ws.splice(key, 1);
                if (user.ws.length == 0) {
                    Users.remove(user.id);
                    log.trace('disconnect: ', user.id);
                    log.debug('Users session: ', Users.length());
                };
            };
            log.warn(e.message);
        };
    };
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