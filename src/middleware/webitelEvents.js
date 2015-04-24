var log = require('../lib/log')(module);

module.exports.eventsHandle = function (events) {
    try {
        var jsonEvent = JSON.parse(events.serialize('json'));
        if (userNotExistsWebitelGroup(jsonEvent))
            return;
        log.debug(jsonEvent['Event-Name'] + ' -> ' + jsonEvent['Event-Domain']);
        jsonEvent['webitel-event-name'] = 'user';
        Domains.broadcast(jsonEvent['Event-Domain'], jsonEvent);

        if (jsonEvent['Event-Name']);
            moduleEventEmitter.emit('webitel::' + jsonEvent['Event-Name'], jsonEvent);

    } catch (e) {
        log.error(e.message);
    };
};

function userNotExistsWebitelGroup (evn) {
    var _id, _domain, _user;

    _id = evn['User-ID'] || evn['Account-User'];
    _domain = evn['User-Domain'] || evn['Account-Domain'];
    if (!_id || !_domain)
        return false;
    _user = Users.get(_id + '@' + _domain);
    if (_user) {
        return !_user.existsUserInGroup('webitel');
    };
    return false;
};