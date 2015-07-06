/**
 * Created by i.navrotskyj on 14.03.2015.
 */

var conf = require('../../../conf'),
    CERT_CDR = conf.get('cdrServer:sslFile'),
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

var fs = require('fs');

module.exports.Redirect = function (request, response, next) {

    var postData = JSON.stringify(request.body);
    var options = {
        host: CDR_SERVER.hostName,
        port: CDR_SERVER.port,
        headers: {},
        method: request.method,
        path: request.originalUrl,
        key: fs.readFileSync(CERT_CDR) ,
        cert: fs.readFileSync(CERT_CDR) ,
        checkServerIdentity: function (host, cert) {
            console.log(host);
            return true;
        }
    };

    options.agent = new https.Agent(options);

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

    var req = https.request(options, function (res) {
        console.dir('statusCode:');
        console.dir(res.statusCode);
        console.dir('headers:');
        console.dir(res.headers);

        res.on('end', function () {
            res.destroy();
            response.end();
        });

        response.writeHead(res.statusCode, res.headers);
        res.pipe(response);
    });

    req.on('error', function(e) {
        log.error(e);
        next(e);
    });

    if (request._body) {
        console.dir('Send body');
        req.write(postData);
    };

    request.on('end', function () {
        console.dir('End request');
        req.end();
    });
    request.pipe(req);
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