/**
 * Created by i.navrotskyj on 19.02.2015.
 */

var HashCollection = require('../lib/HashCollection'),
    eventsCollection = new HashCollection('id'),
    log = require('../lib/log')(module);

module.exports = {
    register: function (eventName) {
        eventsCollection.add(eventName, {
            domains: new HashCollection('id')
        });
    },
    unRegister: function (eventName) {
        eventsCollection.remove(eventName);
    },

    addListener: function (eventName, userId, cb) {
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

        var domainSubscribes = _event.domains.get(_domainId);

        if (!domainSubscribes) {
            _event.domains.add(_domainId, {
                subscribes: [userId]
            });
        } else {
            if (domainSubscribes.subscribes.indexOf(userId) == -1) {
                domainSubscribes.subscribes.push(userId);
            } else {
                // TODO юзер уже подписан...
                return;
            };
        };

        if (cb)
            cb();
    },

    removeListener: function (eventName, userId, cb) {
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
            _domainId = _user[1] || 'root';

        var domainSubscribes = _event.domains.get(_domainId);

        if (domainSubscribes) {
            var _id = domainSubscribes.subscribes.indexOf(userId);
            if (_id != -1) {
                domainSubscribes.subscribes.splice(_id, 1);
            };
        };

        if (cb)
            cb();
    }, 
    
    fire: function (eventName, domainId, event, cb) {
        if (typeof eventName != 'string' || !event) {
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

        var _domain = _event.domains.get(domainId);
        if (!_domain) {
            if (cb)
                cb(new Error('Not subscribes'));
            return;
        };

        _domain.subscribes.forEach(function (userId) {
            var user = Users.get(userId);
            for (var key in user.ws) {
                try {
                    user.ws[key].send(JSON.stringify(event));
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
        });
    }
};