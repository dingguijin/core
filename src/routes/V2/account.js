var DOCS_LINK_ACCOUNT = "",
    rUtil = require('../../lib/requestUtil');

module.exports.Create = function (req, res, next) {
    try {
        if (!webitel.doSendCommandV2(res)) return;
        var domain = req.body.domain,
            login = req.body.login,
            role = req.body.role,
            password = req.body.password;

        if (domain && login && role) {
            if (!webitel.doSendCommandV2(res)) return;

            var _param =[];
            _param.push(login);
            if (password && password != '')
                _param.push(':' + password);
            _param.push('@' + domain);

            webitel.userCreate(req.webitelUser, role, _param.join(''), function(request) {
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