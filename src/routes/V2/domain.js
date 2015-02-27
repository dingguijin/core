var rUtil = require('../../lib/requestUtil'),
    DOCS_LINK_DOMAIN = "";

module.exports.Create = function (req, res, next) {
    try {
        if (!checkPermission(req, res)) return;

        var domain_name = req.body.domain_name,
            customer_id = req.body.customer_id;
        if (domain_name && customer_id) {
            if (!webitel.doSendCommandV2(res)) return;
            webitel.domainCreate(null, domain_name, customer_id, function (request) {
                res.status(200).json(rUtil.getRequestObject((request['body'] && request['body'].indexOf('-ERR') == 0)
                    ? "error" : "OK", request['body'], DOCS_LINK_DOMAIN));
            });
        } else {
            res.status(400).json(rUtil.getRequestObject('error', 'domain_name or customer_id undefined.', DOCS_LINK_DOMAIN));
        }
    } catch (e) {
        next(e)
    };
};

module.exports.Delete = function (req, res, next) {
    try {
        if (!checkPermission(req, res)) return;

        var domain_name = (req.params && req.params.name)
                ? req.params.name
                : '';
        if (domain_name != '') {
            if (!webitel.doSendCommandV2(res)) return;
            webitel.domainRemove(null, domain_name, function(request) {
                res.status(200).send(request.body);
            });
        } else {
            res.status(400).send('domain_name undefined.');
        }
    } catch (e) {
        next(e)
    };
};

module.exports.Get = function (req, res, next) {
    if (!checkPermission(req, res)) return;

    webitel.domainList(null, null, function (response) {
        try {
            if (response['body'].indexOf('-ERR') == 0) {
                res.status(200).json(rUtil.getRequestObject('error', response['body'], DOCS_LINK_DOMAIN));
                return;
            };

            webitel._parsePlainTableToJSON(response.getBody(), null, function (err, data) {
                if (err) {
                    res.status(200).json(rUtil.getRequestObject('OK', err.message, DOCS_LINK_DOMAIN));
                    return;
                };

                res.status(200).json({
                    "status": "OK",
                    "data": data
                });
            });
        } catch (e) {
            log.error(e.message);
        };
    });
};

function checkPermission (req, res) {
    if (!req.webitelUser || req.webitelUser['attr']['role']['val'] !== 2 ) {
        res.status(403).json(rUtil.getRequestObject('error', '-ERR permission denied!', DOCS_LINK_DOMAIN));
        return false;
    };
    return true;
};