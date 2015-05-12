/**
 * Created by i.n. on 05.05.2015.
 */

var request = require('request'),
    conf = require('../conf'),
    CALLMAX_HOST = conf.get('callmax:host'),
    log = require('../../../../lib/log')(module)
    ;

module.exports = {
    api: function (type, api, body, token, cb) {
        try {
            request[type]({
                url: CALLMAX_HOST + api,
                headers: {
                    'Authorization': token
                },
                body: body,
                json: true
            }, function (err, res, body) {
                if (err) {
                    cb(err);
                    return log.error(api + ' ' + err['message']);
                }
                ;

                log.trace('Execute api %s [%s]', api, body && body['id']);
                cb(null, res, body);
            });
        } catch (e) {
            cb(e);
        }
    },

    addBalance: function (id, body, token, cb) {
        try {
            request.patch({
                url: CALLMAX_HOST + 'api/balance/' + id + '/change/',
                headers: {
                    'Authorization': token
                },
                body: body,
                json: true
            }, function (err, res) {
                if (err) {
                    cb(err);
                    return log.error(api + ' ' + err['message']);
                }
                ;

                if (res.statusCode !== 200) {
                    cb(new Error(' Bad response status: ' + res.statusCode));
                    return log.error(' Bad response status: ' + res.statusCode + ' .' + body || '');
                }
                ;

                cb(null, body);
            });
        } catch (e) {
            cb(e);
        }
    },

    destroy: function () {

    }
}