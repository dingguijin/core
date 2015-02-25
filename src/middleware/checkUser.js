var conf = require('../conf'),
    RootName = conf.get("webitelServer:account"),
    RootPassword = conf.get("webitelServer:secret"),
    crypto = require('crypto');
function md5(str) {
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
                cb(null);
            } else {
                cb('auth error: secret incorrect');
            }
            ;
            return
        };
        eslConn.api('user_data ' + login + ' param a1-hash', function (res) {
            var a1Hash = md5(login.replace('@', ':') + ':' + password);
            var registered = (a1Hash == res.body);

            if (registered) {
                cb(null, {
                    "role": {
                        name: 'admin',
                        val: 1
                    },
                    "domain": login.split('@')[1]
                });
                /* TODO определить роль пользователя
                 eslConn.api('user_data ' + login + ' var account_role', function (res) {
                 cb(null, res);
                 });
                 */
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