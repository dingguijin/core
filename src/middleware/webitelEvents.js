var log = require('../lib/log')(module);
module.exports.eventsHandle = function (events) {
    try {
        var jsonEvent = JSON.parse(events.serialize('json'));
        log.debug(jsonEvent['Event-Name'] + ' -> ' + jsonEvent['Event-Domain']);
        jsonEvent['webitel-event-name'] = 'user';
        Domains.broadcast(jsonEvent['Event-Domain'], JSON.stringify(jsonEvent));
    } catch (e) {
        log.error(e.message);
    }
};