var conf = require('../conf'),
    RootName = conf.get("webitelServer:account"),
    RootPassword = conf.get("webitelServer:secret"),
    crypto = require('crypto'),
    xml2js = require('xml2js'),
    log = require('../lib/log')(module),
    ACCOUNT_ROLE = require('../consts').ACCOUNT_ROLE;

var md5 = function (str) {
    var hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
};

module.exports = function (login, password, cb) {
    try {
        login = login || '';
        password = password || '';
        if (login === RootName) {
            if (password === RootPassword) {
                cb(null, {
                    'role': ACCOUNT_ROLE.ROOT
                });
            } else {
                cb('auth error: secret incorrect');
            };
            return
        };

        webitel.userDara(login, 'global', ['a1-hash', 'account_role', 'cc-agent', 'status', 'state', 'description'], function (res) {
            try {
                var resJson = JSON.parse(res['body']);
            } catch (e) {
                cb((res.body
                    ? res.body
                    : e.message));
                return;
            };
            var a1Hash = md5(login.replace('@', ':') + ':' + password);
            var registered = (a1Hash == resJson['a1-hash']);

            if (registered) {
                cb(null, {
                    'role': ACCOUNT_ROLE.getRoleFromName(resJson['account_role']),
                    'domain': login.split('@')[1],
                    'cc-agent': resJson['cc-agent'],
                    'state': resJson['state'],
                    'status': resJson['status'],
                    'description': decodeURI(resJson['description'])
                });
            } else {
                cb('Bad password.');
            };
        });

    } catch (e) {
        cb(e.message || 'Internal server error');
    }
};