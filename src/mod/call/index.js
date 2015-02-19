/**
 * Created by i.navrotskyj on 18.02.2015.
 */

var log = require('../../lib/log')(module),
    HashCollection = require('../../lib/HashCollection');

var CallHandler = function () {
    var calls = new HashCollection('uuid');
    var domains = new HashCollection('id');
    
    this.onHandleCallCreate = function (e) {
        var callId = getCallIdFromEvent(e),
            call = calls.get(callId);

        if (!call && e["variable_domain_name"]) {
            call = {
                "domain": e["variable_domain_name"],
                "callerId": e["Caller-Caller-ID-Number"],
                "destination_number": e["Caller-Destination-Number"]
            };
            calls.add(callId, call);
            var domain = domains.get(e["variable_domain_name"]);
            log.info('ON NEW CALL ON %s, all call %s', e["variable_domain_name"], domain['countCall']);
        };
    };

    this.onHandleCallDestroy = function (e) {
        var callId = getCallIdFromEvent(e),
            call = calls.get(callId);

        if (call)
            calls.remove(callId);

        var domain = domains.get(e['variable_domain_name']) || {};
        log.info('ON END CALL ON %s, all call %s', e['variable_domain_name'], domain['countCall'] || 0);
    };

    calls.on('added', function (e) {
        var domain_id = e['domain'],
            domain = domains.get(domain_id);
        if (domain) {
            domain['countCall'] ++;
        } else {
            domain = {
                "countCall": 1
            };
            domains.add(domain_id, domain);
        };
    });

    calls.on('removed', function (e) {
        var domain_id = e['domain'],
            domain = domains.get(domain_id);
        if (domain) {
            domain['countCall'] --;
            if (domain['countCall'] == 0) {
                domains.remove(domain_id);
            };
        };
    });
};

function getCallIdFromEvent(e) {
    return e["variable_w_account_origination_uuid"] || e["Channel-Call-UUID"];
};

module.exports = CallHandler;