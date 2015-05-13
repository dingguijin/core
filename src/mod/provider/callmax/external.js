/**
 * Created by i.n. on 05.05.2015.
 */

var conf = require('./conf'),
    log = require('../../../lib/log')(module),
    login = require('./middleware/login'),
    PBX_DIALPLAN = conf.get('callmax:defDialplan'),
    api = require('./middleware/execute').api,
    addBalance = require('./middleware/execute').addBalance,
    COUNT_CHAR_PASSWORD = 13,
    PATTERN_PASSWORD = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890',
    info = require('./middleware/referenceInfo'),
    token
    ;


module.exports = function (evt, callback) {

    try {
        log.trace("before create callmax customer.");
        login(function (err, token) {
            if (err) {
                callback(err);
                return;
            };

            info(token, function (err, infoObj) {
                if (err) {
                    callback(err);
                    return;
                };

                api('post', 'api/customers/', {
                    "name": evt['Event-Domain'],
                    "username": evt['Event-Domain'],
                    "email": "100@" + evt['Event-Domain'],
                    "legal_status": "individual",
                    "apply_for_invoices": true,
                    "enabled_by_parent": true,
                    "enabled": true
                }, token, function (err, res, body) {
                    if (err) {
                        callback(err);
                        return;
                    };
                    if (res && res.statusCode != 201) {
                        callback(new Error('Bad request %s'), res['statusMessage']);
                        return;
                    };

                    api('get', 'api/customers/' + body['id'] + '/', null, token,
                        function (err, res, customer) {
                            if (err) {
                                callback(err);
                                return;
                            };
                            if (res && res.statusCode != 200) {
                                callback(new Error('Bad request %s'), customer);
                                return;
                            };

                            api('post','api/pbx/', {
                                "name": 'pbx-' + evt['Event-Domain'],
                                "dialplan_name": PBX_DIALPLAN,
                                "is_active": true,
                                "use_customer_balance": true,
                                "start_date": getCreatedDate(),
                                "owner_name": customer['name'],
                                "owner": customer['id']
                            }, token, function (err, res, pbxRes) {
                                if (err) {
                                    callback(err);
                                    return;
                                };
                                if (res && res.statusCode != 201) {
                                    callback(new Error('Bad request %s'), customer);
                                    return;
                                };

                                api('post', 'api/domain/', {
                                    "pbx": pbxRes['id'],
                                    "domain": customer['name']
                                }, token, function (err, res, domainRes) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    };
                                    if (res && res.statusCode != 201) {
                                        callback(new Error('Bad request %s'), customer);
                                        return;
                                    };

                                    api('post', 'api/extention/', {
                                        "domain_name": domainRes['domain'],
                                        "pbx_name": pbxRes['name'],
                                        "extention_type": "user",
                                        "is_active": true,
                                        "dialplan_name": infoObj['dialName'],
                                        "dialplan": infoObj['dialId'],
                                        "price_plan": infoObj['priceId'],
                                        "extention": domainRes['domain'],
                                        "domain": domainRes['id'],
                                        "max_lines_in": 10,
                                        "max_lines_out": 10,
                                        "pbx": pbxRes['id'],
                                        "authname": evt['Event-Domain'],
                                        "password": makePasswd(COUNT_CHAR_PASSWORD, PATTERN_PASSWORD),
                                        "codecs": [1, 2, 3, 4, 5]
                                    }, token, function (err, res, extRes) {
                                        if (err) {
                                            callback(err);
                                            return;
                                        };
                                        if (res && res.statusCode != 201) {
                                            callback(new Error('Bad request %s'), customer);
                                            return;
                                        };

                                        addBalance(customer['balance'], {
                                            "amount": 1
                                        }, token, function (err, res) {
                                            if (err) {
                                                callback(err);
                                                return;
                                            };
                                            console.dir(res);
                                            callback(null, customer, pbxRes, domainRes, extRes);
                                        });
                                    });
                                });
                            });
                        });
                });

            });
        });
    } catch (e) {
        log.error(e['message']);
    };

};

function getCreatedDate() {
    var date = new Date();
    return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
};

function makePasswd(n, a) {
    var index = (Math.random() * (a.length - 1)).toFixed(0);
    return n > 0 ? a[index] + makePasswd(n - 1, a) : '';
};