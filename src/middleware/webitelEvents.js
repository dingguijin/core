var log = require('../lib/log')(module);
module.exports.eventsHandle = function (events) {
    try {
        var jsonEvent = JSON.parse(events.serialize('json'));

        console.dir(jsonEvent);
        log.debug(jsonEvent['Event-Name'] + ' -> ' + jsonEvent['Event-Domain']);
        jsonEvent['webitel-event-name'] = 'user';
        Domains.broadcast(jsonEvent['Event-Domain'], jsonEvent);

        // TODO Если удаление домена почиститиь связаную информацию.
    } catch (e) {
        log.error(e.message);
    };
};