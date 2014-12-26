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

        var _loginPlain = login.replace('@', ' ');

        eslConn.api('find_user_xml id ' + _loginPlain, function (res) {
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
    } catch (e) {
        cb(e.message || 'Internal server error');
    }
};