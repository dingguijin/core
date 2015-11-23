var HashCollection = require('../lib/HashCollection'),
    log = require('../lib/log')(module),
    Domains = global.Domains = new HashCollection('id'),
    Users = global.Users = new HashCollection('id'),
    ACCOUNT_EVENTS = require('../consts').ACCOUNT_EVENTS,
    ACCOUNT_ROLE = require('../consts').ACCOUNT_ROLE,
    db = require('../lib/mongoDrv'),
    conf = require('../conf'),
    eventsCollection = require('./EventsCollection'),
    handleStatusDb = require('./userStatus')
    ;

moduleEventEmitter.on('webitel::ACCOUNT_ROLE', function (evnt) {
    try {
        var _id = evnt['Account-User'] + '@' + evnt['Account-Domain'];
        var _role = ACCOUNT_ROLE[evnt['Account-Role'].toUpperCase()];
        var _user = Users.get(_id);
        if (_user) {
            _user.attr['role'] = _role;
        };

        var collectionAuth = db.getCollection(conf.get('mongodb:collectionAuth'));
        collectionAuth.update({
            "username": _id
        }, {
            "$set": {
                "role": _role.val
            }}, {"multi": true}, function (err, result) {
            if (err) {
                log.error('Updated db collectionAuth, user %s: %s', _id, err['message']);
                return;
            };
            log.debug('Updated db collectionAuth, user %s: %s', _id, result);
        });

    } catch (e) {
        log.error(e['message']);
    };
});

moduleEventEmitter.on('webitel::USER_CHANGE', function (evnt) {
    try {
        if (evnt['changed'] === "password") {
            var _id = evnt['User-ID'] + '@' + evnt['User-Domain'];
            var collectionAuth = db.getCollection(conf.get('mongodb:collectionAuth'));
            collectionAuth.remove({
                "username": _id
            }, {"multi": true}, function (err, result) {
                if (err) {
                    log.error('Remove db collectionAuth, user %s: %s', _id, err['message']);
                    return;
                }
                ;
                log.debug('Remove db collectionAuth, user %s: %s', _id, result);
            });
        }
        ;
    } catch (e) {
        log.errro(e['message']);
    };
});

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
                };
            };
        };
        //TODO
        _user = Users.get('root');
        if (_user) {
            try {
                Users.sendObject(_user, event);
            } catch (e) {
                log.error(e.message);
            }
        };
    } catch (e) {
        log.error(e.message);
    }
};

Users.on('added', function (evn) {
    try {
        var _id = evn.id.split('@'),
            _domain = _id[1] || _id[0],
            _attr = evn.attr || {},
            domain = Domains.get(_domain),
            jsonEvent;
        try {
            jsonEvent = getJSONUserEvent(ACCOUNT_EVENTS.ONLINE, _domain, _id[0]);
            log.debug(jsonEvent['Event-Name'] + ' -> ' + evn.id);
            Domains.broadcast(_domain, jsonEvent);
            insertSession(_id[0], _domain, _attr['state'], _attr['status'], _attr['description'], true);
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
            insertSession(_id[0], _domain, false, false, false, false);
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

function insertSession (account, domain, state, status, description, online) {
    if (account != 'root') {
        handleStatusDb({
            "account": account,
            "domain": domain,
            "online": online,
            "state": (state || "").toUpperCase(),
            "status": (status || "").toUpperCase(),
            "description": (description || ""),
            "date": Date.now()
        })
    }
}