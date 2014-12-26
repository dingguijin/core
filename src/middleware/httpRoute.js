var log = require('../lib/log')(module),
    conf = require('../conf'),
    rootName = conf.get('webitelServer:account'),
    rootPassword = conf.get('webitelServer:secret') || '';

module.exports.processRequest = function (req, res) {
    try {
        var header = req.headers['authorization'] || '',
            token = header.split(/\s+/).pop() || '',
            auth = new Buffer(token, 'base64').toString(),
            parts = auth.split(/:/),
            username = parts[0],
            password = parts[1],
            responseString = '',
            bodyLen = (req.headers['content-length']) ? parseInt(req.headers['content-length'], 10): 0;

        if (bodyLen > 0) {
            req.on('data', function (data) {
                responseString += data;
            });

            req.on('end', function () {
                if (rootName != username || rootPassword != password) {
                    handleForbidden(res);
                } else {
                    try {
                        var resultObject = JSON.parse(responseString);
                        log.trace(resultObject);
                    } catch (e) {
                        log.warn('Parse error: ', e.message);
                        res.writeHead(400, {'Content-Type': 'text/plain'});
                        res.write(e.message);
                        res.end();
                        return;
                    };
                    handleRequest(req, res, resultObject);
                }
            });
        } else {
            if (rootName !== username || rootPassword !== password) {
                handleForbidden(res);
            } else {
                handleRequest(req, res, {});
            }
        };
    } catch (e) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(e.message);
        res.end();
    };

};

function handleRequest(req, res, resultObject) {
    if (req.method == 'GET') {
        if (req.url === '/api/status') {
            if (eslConn && !eslConn['connecting']) {
                eslConn.api('status', function(response) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify({
                        "Users_Session": Users.length(),
                        "Domain_Session": Domains.length(),
                        "freeSWITCH": response['body'],
                        "Webitel": {
                            "Status": webitel._status == 1 ? "Connected": "Offline",
                            "ApiQueue": webitel.apiCallbackQueue.length,
                            "CmdQueue": webitel.cmdCallbackQueue.length,
                            "Version": webitel.version || ''
                        }
                    }));
                    res.end();
                });
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({
                    "Users": Users.length(),
                    "freeSWITCH": 'Connect server error.',
                    "Webitel": {
                        "Status": webitel._status == 1 ? "Connected": "Offline",
                        "ApiQueue": webitel.apiCallbackQueue.length,
                        "CmdQueue": webitel.cmdCallbackQueue.length,
                        "Version": webitel.version || '',
                    }
                }));
                res.end();
            }
        } else {
            handleForbidden(res);
        };
        return;
    };

    if (req.method == 'POST') {
        if (req.url === '/api/v1/domain') {
            if (resultObject && resultObject['domain_name'] && resultObject['customer_id']) {
                // Create domain
                if (!doSendWebitelCommand(res)) return;

                webitel.domainCreate(null, resultObject['domain_name'], resultObject['customer_id'], function (request) {
                    res.writeHead(200,
                        {'Content-Type': 'text/plain'});
                    res.write(request.body);
                    res.end();
                });
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.write('domain_name or customer_id undefined.');
                res.end();
            };
        } else if (req.url === '/api/v1/accounts') {
            if (resultObject && resultObject['login'] && resultObject['role'] &&
                resultObject['domain']) {

                if (!doSendWebitelCommand(res)) return;

                var _param =[];
                _param.push(resultObject['login']);
                if (resultObject['password'] && resultObject['password'] != '')
                    _param.push(':' + resultObject['password']);
                _param.push('@' + resultObject['domain']);

                webitel.userCreate(null, resultObject['role'], _param.join(''), function(request) {
                    res.writeHead(200,
                        {'Content-Type': 'text/plain'});
                    res.write(request.body);
                    res.end();
                })
            } else {
                res.writeHead(400);
                res.write('login, role or domain is undefined.');
                res.end();
            }
        } else {
            handleForbidden(res);
        };
    } else if (req.method == 'DELETE') {
        if (/^\/api\/v1\/reloadxml$/g.exec(req.url || '')) {
            if (!doSendWebitelCommand(res)) return;
            webitel.reloadXml(null, function () {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.write('+OK');
                res.end()
            });
            return;
        };

        var url = /^\/api\/v1\/domain\/(.*)$/g.exec(req.url || '');
        if (url) {
            if (url[1]) {
                if (!doSendWebitelCommand(res)) return;
                webitel.domainRemove(null, url[1], function(request) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(request.body);
                    res.end()
                })
            } else {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.write('domain_name is undefined.');
                res.end();
            }
        } else {
            handleForbidden(res);
        }
    } else {
        handleForbidden(res);
    }
};

var handleForbidden = function(res) {
    res.writeHead(403, {'Content-Type': 'text/plain'});
    res.write("Forbidden!");
    res.end();
};

var doSendWebitelCommand = function (res) {
    if (!webitel.authed) {
        try {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write("Error: Webitel server disconnect!");
            res.end();
            return false;
        } catch (e) {
            log.warn('Write message:', e.message);
            return false;
        };
    };
    return true;
};