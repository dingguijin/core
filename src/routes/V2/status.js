module.exports = function (req, res, next) {
    if (eslConn && !eslConn['connecting']) {
        eslConn.api('status', function(response) {
            res.json({
                "Version": process.env['VERSION'] || '',
                "Users_Session": Users.length(),
                "Domain_Session": Domains.length(),
                "CRASH_WORKER_COUNT": process.env['CRASH_WORKER_COUNT'] || 0,
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
            "Version": process.env['VERSION'] || '',
            "Users_Session": Users.length(),
            "Domain_Session": Domains.length(),
            "CRASH_WORKER_COUNT": process.env['CRASH_WORKER_COUNT'] || 0,
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