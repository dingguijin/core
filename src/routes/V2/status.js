var os = require('os'),
    pretty = require('prettysize');

module.exports = function (req, res, next) {
    if (eslConn && !eslConn['connecting']) {
        eslConn.api('status', function(response) {
            res.json(getResult(response));
        });
    } else {
        res.json(getResult(false));
    };
};


function getResult (freeSwitchStatus) {
    return {
        "Version": process.env['VERSION'] || '',
        "Node memory": getMemoryUsage(),
        "Process ID": process.pid,
        "Process up time": formatTime(process.uptime()),
        "OS": getOsInfo(),
        "Users_Session": Users.length(),
        "Domain_Session": Domains.length(),
        "CRASH_WORKER_COUNT": process.env['CRASH_WORKER_COUNT'] || 0,
        "Webitel": {
            "Status": webitel._status == 1 ? "Connected": "Offline",
            "ApiQueue": webitel.apiCallbackQueue.length,
            "CmdQueue": webitel.cmdCallbackQueue.length
        },
        "freeSWITCH": (freeSwitchStatus) ? freeSwitchStatus['body'] : 'Connect server error.'
    }
}

function getMemoryUsage () {
    var memory = process.memoryUsage();
    return {
        "rss": pretty(memory['rss']),
        "heapTotal": pretty(memory['heapTotal']),
        "heapUsed": pretty(memory['heapUsed'])
    }
};

function formatTime(seconds){
    function pad(s){
        return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60*60));
    var minutes = Math.floor(seconds % (60*60) / 60);
    var seconds = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
};

function getOsInfo () {
    return {
        "Total memory": pretty(os.totalmem()),
        "Free memory": pretty(os.freemem()),
        "Platform": os.platform(),
        "Name": os.type(),
        "Architecture": os.arch()
    };
};