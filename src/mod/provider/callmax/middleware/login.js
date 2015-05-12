/**
 * Created by i.n. on 05.05.2015.
 */
var request = require('request'),
    conf = require('../conf'),
    log = require('../../../../lib/log')(module),
    CALLMAX_HOST = conf.get('callmax:apiHost'),
    CALLMAX_USER = conf.get('callmax:username'),
    CALLMAX_PASS = conf.get('callmax:password');

module.exports = function (cb) {
    try {
        if (!CALLMAX_HOST) {
            cb(new Error('Bad CallMax settings.'));
            return;
        };
        request.post({
            url: CALLMAX_HOST + 'api/auth-token/',
            body: {
                "username": CALLMAX_USER,
                "password": CALLMAX_PASS,
                "sipauth": false
            },
            json: true
        }, function (err, res, body) {
            if (err) {
                cb(err);
                return log.error(err['message']);
            }
            ;

            if (res.statusCode !== 200 || !body || !body['token']) {
                cb(new Error('Bad response status: ' + res.statusCode));
                return log.error('Bad response status: ' + res.statusCode + ' .' + body || '');
            }
            ;
            cb(null, 'Token ' + body['token']);
        });
    } catch (e) {
        cb(e);
    }
}