var WebitelCommandTypes = require('../consts').WebitelCommandTypes,
    RootName = require('../consts').RootName,
    crypto = require('crypto'),
    log = require('../lib/log')(module);
function md5(str) {
    var hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
};

module.exports = function (wss, eslConn) {

}