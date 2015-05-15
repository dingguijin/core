/**
 * Created by i.n. on 13.05.2015.
 */

var conf = require('../conf'),
    log = require('../../../../lib/log')(module),
    login = require('./login'),
    PBX_DIALPLAN = conf.get('callmax:defDialplan'),
    PBX_PRICE = conf.get('callmax:defPrice'),
    api = require('./execute').api,
    result = {
        priceId: null,
        dialId: null,
        dialName:  PBX_DIALPLAN
    }
    ;

module.exports = function (token, cb) {
    try {
        if (result['priceId'] != null && result['dialId'] != null) {
            cb(null, result);
            return;
        }
        ;

        api('get', 'api/priceplan/', null, token, function (err, res, resObj) {
            try {
                if (err) {
                    cb(err);
                    return;
                }
                ;

                if ((res && res.statusCode != 200) || typeof resObj !== 'object') {
                    cb(new Error('Bad response.'))
                }
                ;

                for (var key in resObj['results']) {
                    if (resObj['results'][key]['name'] == PBX_PRICE) {
                        result['priceId'] = resObj['results'][key]['id'];
                        break;
                    }
                    ;
                }
                ;

                if (!result['priceId']) {
                    cb(new Error('Price not found.'));
                    return;
                }
                ;

                api('get', 'api/dialplan/', null, token, function (err, res, resObj) {
                    try {
                        if (err) {
                            cb(err);
                            return;
                        }
                        ;

                        if ((res && res.statusCode != 200) || typeof resObj !== 'object') {
                            cb(new Error('Bad response.'))
                        }
                        ;

                        for (var key in resObj['results']) {
                            if (resObj['results'][key]['name'] == PBX_DIALPLAN) {
                                result['dialId'] = resObj['results'][key]['id'];
                                break;
                            }
                            ;
                        }
                        ;

                        if (!result['dialId']) {
                            cb(new Error('Dialplan not found.'));
                            return;
                        }
                        ;
                        cb(null, result);
                        return;
                    } catch (e) {
                        cb(e);
                    };
                });
            } catch (e) {
                cb(e);
            }
            ;
        });
    } catch (e) {
        cb(e);
    };
};