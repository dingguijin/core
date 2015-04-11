var conf = require('../conf'),
    socketTimeUnauthorized = conf.get('application:socketTimeUnauthorized'),
    log = require('../lib/log')(module),
    handleSocketError = require('../middleware/handleSocketError'),
    generateUuid = require('node-uuid')
    ;
var heapdump = require("heapdump");

function writeEndSnapshot () {
    setTimeout(function () {
        console.log("Running GC");
        gc();

        heapdump.writeSnapshot(__dirname + "/final.heapsnapshot", function writeFinalSnapshot () {
            console.log("Wrote final heap snapshot");
        });
    }, 1000);
};

module.exports = function (wss) {
    wss.on('connection', function(ws) {

        heapdump.writeSnapshot(__dirname + "/initial.heapsnapshot", function writeInitialSnapshot () {
            console.log("Wrote initial heap snapshot");
        });

        ws['webitelSessionId'] = generateUuid.v4();

        if (socketTimeUnauthorized > 0) {
            setTimeout(function () {
                if (!ws['upgradeReq']['webitelId']) {
                    try {
                        ws.send(JSON.stringify({
                            "webitel-event-name": "account",
                            "Event-Name": "DISCONNECT"
                        }));
                        ws.close();
                    } catch (e) {
                        log.warn('User socket close:', e.message);
                    }
                }
            }, socketTimeUnauthorized * 1000);
        }
        ws.on('message', function(message) {
            log.trace('received: %s', message);
            console.log(process.memoryUsage().heapUsed);
            try {
                var msg = JSON.parse(message);
                var execId = msg['exec-uuid'];
                var args = msg['exec-args'] || {};

                if (msg['exec-func']) {
                    commandEmitter.emit('wss::' + msg['exec-func'], execId, args, ws);
                };

            } catch (e) {
                handleSocketError(ws);
                log.error('Command error:', e.message);
            };
        });

        ws.on('close', function () {
            try {
                var agentId = this['upgradeReq']['webitelId'];
                var user = Users.get(agentId);
                if (user && user.ws) {
                    for (var key in user.ws) {
                        if (this == user.ws[key]) {
                            user.ws.splice(key, 1);
                            if (user.ws.length == 0) {
                                Users.remove(agentId);
                                log.trace('disconnect: ', agentId);
                                log.debug('Users session: ', Users.length());
                            };
                        };
                    };
                };
                writeEndSnapshot();
            } catch (e) {
                log.error(e);
            }
        });

        ws.on('error', function(e) {
            log.error('Socket error:', e);
        });
    });
};