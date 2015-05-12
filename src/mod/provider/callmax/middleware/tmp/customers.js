/**
 * Created by i.n. on 05.05.2015.
 */

var request = require('request'),
    conf = require('../../conf'),
    CALLMAX_HOST = conf.get('callmax:host'),
    log = require('../../../../../lib/log')(module)
    ;

module.exports = {
    create: function (customer, token, cb) {
        request.post({
            url: CALLMAX_HOST + 'api/customers/',
            headers: {
                'Authorization': token
            },
            body: customer,
            json: true
        }, function (err, res, body) {
            if (err) {
                cb(err);
                return log.error(err['message']);
            };

            if (res.statusCode !== 201 || !body) {
                cb(new Error('Bad response status: ' + res.statusCode));
                return log.error('Bad response status: ' + res.statusCode + ' .' + body || '');
            };
            log.trace('Create customer %s', body['name']);
            cb(null, body);
        });
    },

    destroy: function () {

    }
}