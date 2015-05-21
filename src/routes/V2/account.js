var DOCS_LINK_ACCOUNT = "",
    rUtil = require('../../lib/requestUtil');

module.exports.Create = function (req, res, next) {
    try {
        if (!webitel.doSendCommandV2(res)) return;
        var domain = req.body.domain,
            login = req.body['login'],
            role = req.body['role'],
            password = req.body['password'],
            parameters = req.body['parameters'],
            variables = req.body['variables']
            ;

        if (domain && login && role) {
            if (!webitel.doSendCommandV2(res)) return;

            var _param =[];
            _param.push(login);
            if (password && password != '')
                _param.push(':' + password);
            _param.push('@' + domain);

            var q = {
                "role": role,
                "param": _param.join(''),
                "attribute": {
                    "parameters": parameters,
                    "variables": variables,
                    "extensions": req.body['extensions']
                }
            };

            webitel.userCreate(req.webitelUser, q, function(request) {
                res.status(200).json(rUtil.getRequestObject((request['body'] && request['body'].indexOf('-ERR') == 0)
                    ? "error" : "OK", request['body'], DOCS_LINK_ACCOUNT));
            });

        } else {
            res.status(400).json(rUtil.getRequestObject('error', 'login, role or domain is undefined.', DOCS_LINK_ACCOUNT));
        };
    } catch (e) {
        next(e)
    }
};

module.exports.Get = function (req, res, next) {
    if (!webitel.doSendCommandV2(res)) return;

    webitel.list_users(req.webitelUser, req.query['domain'], function (request) {
        if (request['body'] instanceof Object) {
            res.status(200).json({
                "status": "OK",
                "data": request['body']
            });
        } else {
            res.status(200).json(rUtil.getRequestObject((request['body'] && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], DOCS_LINK_ACCOUNT));
        };
    }, 'json');
};

module.exports.GetItem = function (req, res, next) {
    if (!webitel.doSendCommandV2(res)) return;
    webitel.userItem(req.webitelUser, req.params['name'], req.query['domain'], function (request) {
        if (request['body'] instanceof Object) {
            res.status(200).json({
                "status": "OK",
                "data": request['body']
            });
        } else {
            res.status(200).json(rUtil.getRequestObject((request['body'] && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], DOCS_LINK_ACCOUNT));
        };
    });
};

module.exports.Update = function (req, res, next) {
    if (!webitel.doSendCommandV2(res)) return;
    // TODO
    res.status(404).json({
        "status": "error"
    });
};

module.exports.Delete = function (req, res, next) {
    if (!webitel.doSendCommandV2(res)) return;
    var id = req.params['name']
        // TODO
        ;
        //domain = req.query['domain'] || ;
    webitel.userRemove
};