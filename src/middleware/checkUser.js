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
        // TODO Нужна оптимизация, при большых нагрузках ивенты свича залипают. !!!
        var _loginPlain = login.replace('@', ' ');
        var parseXmlBody = function (body, login) {
            var parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false }),
                headers = {},
                _body = body;

            try {
                parser.parseString(body, function (err, data) {
                    if (err) {
                        log.debug('Auth error: %s %s', login, _body.replace('\n', ''));
                        return;
                    }
                    ;
                    var _attr = [].concat(data.params.param, data.variables.variable);
                    _attr.forEach(function (header) {
                        headers[header['$'].name] = header['$'].value;
                    });

                });
            } catch (e){
                log.error(e.message);
            }

            return headers;
        };
        eslConn.bgapi('find_user_xml id ' + _loginPlain, function (res) {
            var _jsonParamUser = parseXmlBody(res['body'], _loginPlain);

            var a1Hash = md5(login.replace('@', ':') + ':' + password);
            var registered = (a1Hash == _jsonParamUser['a1-hash']);

            if (registered) {
                cb(null, {
                    'role': ACCOUNT_ROLE.getRoleFromName(_jsonParamUser['account_role']),
                    'domain': login.split('@')[1]
                });
            } else {
                cb(((res.body && res.body.indexOf('-ERR no reply\n') == 0)
                    ? 'user not found'
                    : 'secret incorrect'));
            };
        });
        /*
        webitel.userDara(login, 'global', ['a1-hash', 'account_role'], function (res) {
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
                    'domain': login.split('@')[1]
                });
            } else {
                cb('Bad password.');
            };
        });
        */
    } catch (e) {
        cb(e.message || 'Internal server error');
    }
};