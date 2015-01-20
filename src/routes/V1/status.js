module.exports = function (req, res, next) {
    if (eslConn && !eslConn['connecting']) {
        eslConn.api('status', function(response) {
            res.json({
                "Users_Session": Users.length(),
                "Domain_Session": Domains.length(),
                "freeSWITCH": response['body'],
                "Webitel": {
                    "Status": webitel._status == 1 ? "Connected": "Offline",
                    "ApiQueue": webitel.apiCallbackQueue.length,
                    "CmdQueue": webitel.cmdCallbackQueue.length,
                    "Version": webitel.version || ''
                }
            });
        });
    } else {
        res.json({
            "Users": Users.length(),
            "freeSWITCH": 'Connect server error.',
            "Webitel": {
                "Status": webitel._status == 1 ? "Connected": "Offline",
                "ApiQueue": webitel.apiCallbackQueue.length,
                "CmdQueue": webitel.cmdCallbackQueue.length,
                "Version": webitel.version || ''
            }
        });
    };
};