var log = require('../lib/log')(module);
module.exports.eventsHandle = function (event) {
    try {
        var jsonEvent = JSON.parse(event.serialize());
        if (jsonEvent['Channel-Presence-ID']) {
            if (jsonEvent['Event-Name'] == 'CHANNEL_EXECUTE_COMPLETE') {
                return;
            };
            var user = Users.get(jsonEvent['Channel-Presence-ID']);
            jsonEvent['webitel-event-name'] = 'call';
            if (user) {
                var jsonRequest = {
                    "webitel-event-name": 'call',
                    "Event-Name": jsonEvent['Event-Name'],
                    "Channel-Presence-ID": jsonEvent['Channel-Presence-ID'],
                    "Unique-ID": jsonEvent["Unique-ID"],
                    "Channel-Call-UUID": jsonEvent["Channel-Call-UUID"],
                    "Channel-Call-State": jsonEvent["Channel-Call-State"],
                    "Channel-State-Number": jsonEvent["Channel-State-Number"],
                    "Channel-State": jsonEvent["Channel-State"],
                    "Answer-State": jsonEvent["Answer-State"],
                    "Call-Direction": jsonEvent["Call-Direction"],
                    "variable_sip_call_id": jsonEvent["variable_sip_call_id"],
                    "Caller-Callee-ID-Name": jsonEvent["Caller-Callee-ID-Name"],
                    "Caller-Callee-ID-Number": jsonEvent["Caller-Callee-ID-Number"],
                    "Caller-Caller-ID-Name": jsonEvent["Caller-Caller-ID-Name"],
                    "Caller-Caller-ID-Number": jsonEvent["Caller-Caller-ID-Number"],
                    "Caller-Destination-Number": jsonEvent["Caller-Destination-Number"],
                    "variable_w_account_origination_uuid": jsonEvent["variable_w_account_origination_uuid"],
                    "variable_w_jsclient_xtransfer": jsonEvent["variable_w_jsclient_xtransfer"] || jsonEvent['variable_sip_h_X-WebitelXTransfer'],
                    "variable_w_jsclient_originate_number": jsonEvent["variable_w_jsclient_originate_number"],
                    "Call-Info": jsonEvent["Call-Info"],
                    "Other-Leg-Unique-ID": jsonEvent["Other-Leg-Unique-ID"],
                    "variable_hangup_cause": jsonEvent["variable_hangup_cause"],
                    "Caller-Channel-Created-Time": jsonEvent["Caller-Channel-Created-Time"],
                    "Caller-Channel-Answered-Time": jsonEvent["Caller-Channel-Answered-Time"],
                    "Caller-Channel-Hangup-Time": jsonEvent["Caller-Channel-Hangup-Time"],
                    "DTMF-Digit": jsonEvent["DTMF-Digit"],
                    "Application": jsonEvent["Application"],
                    "Application-Data": jsonEvent["Application-Data"]
                };

                for (var key in user.ws) {
                    try {
                        //if (user.ws[key]['upgradeReq']['logged']) // FAVBET
                            user.ws[key].send(JSON.stringify(jsonRequest));
                    } catch (e) {
                        if (user.ws[key].readyState == user.ws[key].CLOSED) {
                            user.ws.splice(key, 1);
                            if (user.ws.length == 0) {
                                Users.remove(user.id);
                                log.info('disconnect: ', user.id);
                                log.info('Users session: ', Users.length());
                            };
                        };
                        log.warn(e.message);
                    };
                };
            };
            log.info(jsonEvent['Event-Name'] + ' -> ' + jsonEvent["Unique-ID"] || "Other ESL event.");
        };
//        log.info(jsonEvent);
    } catch (e) {
        log.error(e.message);
    }
}