/**
 * Created by i.navrotskyj on 19.02.2015.
 */

var HashCollection = require('../lib/HashCollection'),
    eventsCollection = new HashCollection('id'),
    log = require('../lib/log')(module);

var _eventsModule = {
    register: function (eventName) {
        if (!eventName || eventName == '')
            return;
        eventsCollection.add(eventName, {
            domains: new HashCollection('id')
        });
        log.info('Register event %s', eventName);
    },
    unRegister: function (eventName) {
        eventsCollection.remove(eventName);
        log.trace('Unregister event %s', eventName);
    },

    addListener: function (eventName, userId, sessionId, cb) {
        if (typeof eventName != 'string' || !userId ) {
            if (cb)
                cb(new Error('Bad parameters.'));
            return;
        };

        var _event = eventsCollection.get(eventName);
        if (!_event) {
            if (cb)
                cb(new Error('Event unregister'));
            return;
        };

        var _user = userId.split('@'),
            _domainId = _user[1] || 'root';

        var domainSubscribes = _event.domains.get(_domainId),
            _userId = (userId + ':' + sessionId);

        if (!domainSubscribes) {
            _event.domains.add(_domainId, {
                subscribes: [_userId]
            });
        } else {
            if (domainSubscribes.subscribes.indexOf(_userId) == -1) {
                domainSubscribes.subscribes.push(_userId);
            } else {
                if (cb)
                    cb(new Error('event subscribed!'));
                return;
            };
        };

        if (cb)
            cb(null, '+OK: subscribe ' + eventName);
    },

    removeListener: function (eventName, userId, sessionId, cb) {
        if (typeof userId != 'string' || typeof eventName != 'string') {
            if (cb)
                cb(new Error('Bad parameters'));
            return;
        };

        var _event = eventsCollection.get(eventName);
        if (!_event) {
            if (cb)
                cb(new Error('Event unregister'));
            return;
        };

        var _user = userId.split('@'),
            _domainId = _user[1] || 'root',
            _userId = (userId + ':' + sessionId);

        var domainSubscribes = _event.domains.get(_domainId);

        if (domainSubscribes) {
            var _id = domainSubscribes.subscribes.indexOf(_userId);
            if (_id != -1) {
                domainSubscribes.subscribes.splice(_id, 1);
            };
        };

        if (cb)
            cb(null, '+OK: unsubscribe ' + eventName);
    }, 
    // TODO existsCb переделать
    fire: function (eventName, domainId, event, cb, existsFn) {
        if (typeof eventName != 'string' || !(event instanceof Object)) {
            if (cb)
                cb(new Error('Bad parameters'));
            return;
        };

        var _event = eventsCollection.get(eventName);
        if (!_event) {
            if (cb)
                cb(new Error('Event unregister'));
            return;
        };

        var _domain = _event.domains.get(domainId),
            tmpUsr;
        if (!_domain) {
            if (cb)
                cb(new Error('Not subscribes'));
            return;
        };
        event['webitel-event-name'] = 'server';
        _domain.subscribes.forEach(function (userId) {
            tmpUsr = userId.split(':');
            var _userId = tmpUsr[0],
                sessionId = tmpUsr[1];
            var user = Users.get(_userId);

            if (!user) return;

            if (existsFn && !existsFn(user, event, eventName)) {
                return;
            };

            for (var key = 0, len = user.ws.length; key < len; key ++ ) {
                try {
                    if (user.ws[key]['webitelSessionId'] !== sessionId) continue;
                    user.ws[key].send(JSON.stringify(event));
                    log.debug('Emit server event %s --> %s', eventName, userId);
                } catch (e) {
                    _eventsModule.removeListener(eventName, userId);
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
        });
    },

    getEventSubscribers: function (evtName, domainName) {
        var res = [];
        try {
            var _e = eventsCollection.get(evtName),
                domain;
            if (_e) {
                domain = _e.domains.get(domainName);
                if (domain) {
                    res = domain['subscribes'];
                }
                ;
            }
            ;
        } catch (e) {
            log.error(e['message']);
        } finally {
            return res;
        };
    },

    removeUserSubscribe: function (userName, domainName) {
        var eventsKeys = eventsCollection.getKeys(),
            event,
            _domain;
        eventsKeys.forEach(function (key) {
            event = eventsCollection.get(key);
            if (event) {
                //  /([^@]+)@([^:]+):/
                _domain = event.domains.get(domainName);
                if (!_domain)
                    return;

                for (var i = 0, len = _domain.subscribes.length; i < len; i++) {
                    if (_domain.subscribes[i].indexOf(userName) == 0) {
                        _domain.subscribes.splice(i, 1);
                        log.trace('Event %s remove subscriber %s in %s', key, userName, domainName);
                    };
                };
            };
        });
    }
};

module.exports = _eventsModule;