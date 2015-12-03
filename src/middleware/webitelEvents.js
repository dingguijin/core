var log = require('../lib/log')(module);
var handleStatusDb = require('./userStatus');

module.exports.eventsHandle = function (events) {
    try {

        var jsonEvent = JSON.parse(events.serialize('json'));
        //if (userNotExistsWebitelGroup(jsonEvent))
        //    return;
        log.debug(jsonEvent['Event-Name'] + ' -> ' + jsonEvent['Event-Domain']);
        jsonEvent['webitel-event-name'] = 'user';


        if (events.type == 'ACCOUNT_STATUS') {
            var user = Users.get(jsonEvent['Account-User'] + '@' + jsonEvent['Account-Domain']);
            jsonEvent['Account-Online'] = !!user;
            jsonEvent['cc_logged'] = user && user['cc_logged'];

            var data = {
                "domain": jsonEvent['Account-Domain'],
                "account": jsonEvent['Account-User'],
                "status": jsonEvent['Account-Status'],
                "state": jsonEvent['Account-User-State'],

                "description": jsonEvent['Account-Status-Descript'] ? decodeURI(jsonEvent['Account-Status-Descript']) : '',
                "online": !!user,
                "date": Date.now()
            };
            handleStatusDb(data);
        };

        Domains.broadcast(jsonEvent['Event-Domain'], jsonEvent);

        if (jsonEvent['Event-Name'])
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