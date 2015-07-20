/**
 * Created by i.navrotskyj on 14.03.2015.
 */

var conf = require('../../../conf'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    log = require('../../../lib/log')(module),
    CDR_SERVER_HOST = conf.get('cdrServer:host'),
    sslServerListener = conf.get('ssl:enabled');

if (CDR_SERVER_HOST) {
    CDR_SERVER_HOST = CDR_SERVER_HOST.replace(/\/$/g, '');
};

var cdrHostInfo = url.parse(CDR_SERVER_HOST);

var client = sslServerListener.toString() === 'false' ? http.request : https.request;

var CDR_SERVER = {
    hostName: cdrHostInfo.hostname,
    port: parseInt(cdrHostInfo.port)
};

module.exports.Redirect = function (request, response, next) {
    var postData = JSON.stringify(request.body);
    var options = {
        hostname: CDR_SERVER.hostName,
        port: CDR_SERVER.port,
        path: request.originalUrl,
        headers: {

        },
        method: request.method,
        rejectUnauthorized: false
    };

    if (request.headers.hasOwnProperty('content-type')) {
        options.headers['content-type'] = request.headers['content-type']
    };
    if (request.headers.hasOwnProperty('content-length')) {
        options.headers['content-length'] = request._body
            ? Buffer.byteLength(postData)
            : request.headers['content-length'];
    };
    if (request.headers.hasOwnProperty('x-access-token')) {
        options.headers['x-access-token'] = request.headers['x-access-token']
    };
    if (request.headers.hasOwnProperty('x-key')) {
        options.headers['x-key'] = request.headers['x-key']
    };

    var req = client(options, function(res) {
        try {
            res.on('end', function () {
                res.destroy();
            });

            response.writeHead(res.statusCode, res.headers);

            res.pipe(response);
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
    //req.end();
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