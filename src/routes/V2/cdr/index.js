/**
 * Created by i.navrotskyj on 14.03.2015.
 */

var conf = require('../../../conf'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    log = require('../../../lib/log')(module),
    CDR_SERVER_HOST = conf.get('cdrServer:host');

if (CDR_SERVER_HOST) {
    CDR_SERVER_HOST = CDR_SERVER_HOST.replace(/\/$/g, '');
};

var cdrHostInfo = url.parse(CDR_SERVER_HOST);

var client = cdrHostInfo.protocol === 'https:' ? https.request : http.request;

var CDR_SERVER = {
    hostName: cdrHostInfo.hostname,
    port: cdrHostInfo.port
};

module.exports.Redirect = function (request, response, next) {
    var postData = JSON.stringify(request.body);
    var options = {
        hostname: CDR_SERVER.hostName,
        port: CDR_SERVER.port,
        path: request.originalUrl,
        method: request.method,
        headers: request.headers,
        rejectUnauthorized: false
    };

    var req = client(options, function(res) {
        try {
            res.on('end', function () {
                res.destroy();
            });

            response.writeHead(res.statusCode, res.headers);

            res.pipe(response);
            response.pipe(res);
        } catch (e){
            log.error(e);
        }
    });

    req.on('error', function(e) {
        log.error(e);
        next(e);
    });

// write data to request body
    if (request._body) {
        req.write(postData);
    };
    request.on('end', function () {
       req.end();
    });
    request.pipe(req);
    req.pipe(request);
};

module.exports.GetRedirectUrl = function (req, res, next) {
    if (!CDR_SERVER_HOST) {
        return res.status(500).json({
            "status": "error",
            "info": "Not config CDR_SERVER_HOST"
        });
    };
    res.status(200).json({
        "status": "OK",
        "info": CDR_SERVER_HOST + req.originalUrl.replace(/(\/api\/v2\/)(r\/)/, '$1')
    });
};