/**
 * Created by i.n. on 05.05.2015.
 */

var conf = require('./conf'),
    PROVIDER_HOST = conf.get('callmax:srvHost'),
    log = require('../../../lib/log')(module),
    callmaxCreateCustomer = require('./external'),
    webitelCreateCustomer = require('./internal')
    ;


module.exports = function () {

    moduleEventEmitter.on("webitel::DOMAIN_CREATE", function (evt) {
        try {
            if (evt && evt['provider'] === 'callmax') {

                callmaxCreateCustomer(evt, function (err, customer, pbxRes, domainRes, extRes) {
                    if (err) {
                        log.error(err['message']);
                        return;
                    };
                    webitelCreateCustomer({
                        "domain": customer["name"],
                        "name": customer["name"],
                        "username": customer["name"],
                        "password": extRes["password"],
                        "realm": PROVIDER_HOST
                    }, function (err, result) {
                        if (err) {
                            log.error(err['message']);
                            return;
                        };
                        log.trace('finish create DOMAIN: %s', customer["name"]);
                    });
                });

            };
        } catch (e) {
            log.error(e['message']);
        };
    });

};
