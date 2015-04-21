/**
 * Created by i.navrotskyj on 14.03.2015.
 */

var conf = require('../../../conf'),
    CDR_SERVER_HOST = conf.get('cdrServer:host');

if (CDR_SERVER_HOST) {
    CDR_SERVER_HOST = CDR_SERVER_HOST.replace(/\/$/g, '');
};

module.exports.Redirect = function (req, res, next) {
    if (!CDR_SERVER_HOST) {
        return res.status(500).json({
            "status": "error",
            "info": "Not config CDR_SERVER_HOST"
        });
    };
    res.redirect(307, CDR_SERVER_HOST + req.originalUrl);
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