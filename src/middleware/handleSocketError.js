var log = require('../lib/log')(module);
module.exports = function (ws) {
    try {
        var userId = ws['upgradeReq']['webitelId'],
            user = Users.get(userId);
        if (user) {
            for (var key in user.ws) {
                if (user.ws[key].readyState == user.ws[key].CLOSED) {
                    user.ws.splice(key, 1);
                    if (user.ws.length == 0) {
                        Users.remove(user.id);
                        log.info('disconnect: ', user.id);
                        log.info('Users session: ', Users.length());
                    }
                    ;
                };
            };
        };
    } catch (e) {
        log.error(e.message);
    };
};