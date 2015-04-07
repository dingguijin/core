var url = require("url"),
    log = require('../../../lib/log')(module),
    rUtil = require('../../../lib/requestUtil');

var Calls = {
    getChannels: function (req, res, next) {
        try {
            var _item = '',
                parts = url.parse(req.url, true, true),
                query = parts.query,
                _domain = query.domain;
            if (req.webitelUser && req.webitelUser['attr'] && req.webitelUser['attr']['domain']) {
                _domain = req.webitelUser['attr']['domain']
            };
            if (_domain) {
                _item = ' like %@' + _domain;
            };
            eslConn.show('channels' + _item, 'json', function (err, parsed) {
                if (err)
                    return res.status(500).json(rUtil.getRequestObject('error', err.message));
                res.status(200).json({
                    "status": "OK",
                    "data": parsed
                });
            });
        } catch (e) {
            next(e);
        };
    },

    Originate: function (req, res, next) {

        var extension = req.body.calledId, // CALLE
            user = req.body.callerId || '', //CALLER
            auto_answer_param = req.body.auto_answer_param;

        if (req.webitelUser && req.webitelUser['attr'] && req.webitelUser['attr']['domain']) {
            user = user.split('@')[0] + '@' + req.webitelUser['attr']['domain']
        };

        var _originatorParam = new Array('w_jsclient_originate_number=' + extension),
            _autoAnswerParam = [].concat( auto_answer_param || []),
            _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

        var dialString = ('originate ' + _param + 'user/' + user + ' ' + extension +
        ' xml default ' + user.split('@')[0] + ' ' + user.split('@')[0]);
        log.trace(dialString);

        eslConn.bgapi(dialString, function (result) {
            sendResponse(result, res, "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Создатьканал.");
        });
    },

    KillUuid: function (req, res, next) {
        var params = req.params,
            uuid = params['id'],
            docsLink = "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Завершить.";

        if (uuid) {
            eslConn.bgapi('uuid_kill ' + uuid, function (result) {
                sendResponse(result, res, docsLink);
            });
        } else {
            res.status(400).json({
                "status": "error",
                "info": "Bad parameters channel id",
                "more info": docsLink
            });
        };
    },

    FakeCall: function (req, res, next) {
        var number = req.body.number || '',
            displayNumber = req.body.displayNumber || '00000',
            dialString =  ''.concat('originate ', '[origination_caller_id_number=', displayNumber, ']', 'user/', number, ' &echo()')
            ;
        eslConn.bgapi(dialString, function (result) {
            sendResponse(result, res, "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Создатьканал.");
        });
    },

    ChangeState: function (req, res, next) {
        var params = req.params,
            uuid = params['id'],
            state = req.body['state'],
            docUrlInfo = "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Изменитьсостояниеканала.";

        if (uuid && state) {
            var app;

            switch (state) {
                case 'hold':
                    app = 'uuid_hold';
                    break;
                case 'unhold':
                    app = 'uuid_hold off';
                    break;
            };

            if (!app) {
                res.status(400).json({
                    "status": "error",
                    "info": "Bad parameters channel state",
                    "more info": docUrlInfo
                });
                return;
            };
            eslConn.bgapi(app + ' ' + uuid, function (result) {
                sendResponse(result, res, docUrlInfo);
            });
        } else {
            res.status(400).json({
                "status": "error",
                "info": "Bad parameters channel id or state",
                "more info": docUrlInfo
            });
        };
    },

    fakeCall: function (req, res, next) {
        var number = req.body.number || '',
            displayNumber = req.body.displayNumber || '00000',
            dialString =  ''.concat('originate ', '[origination_caller_id_number=', displayNumber, ']', 'user/', number, ' &echo()')
            ;
        eslConn.bgapi(dialString, function (result) {
            sendResponse(result, res, "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Создатьканал.");
        });
    }
};

function sendResponse(result, response, docsLinc) {
    try {
        if (result && result['body']) {
            response.status(200).json({
                "status": "OK",
                "info": result['body'],
                "more info": docsLinc
            });
        } else {
            response.status(200).json({
                "status": "error",
                "info": "No reply",
                "more info": docsLinc
            });
        }
    } catch (e) {
        response.status(500).json({
            "status": "error",
            "info": e.message,
            "more info": docsLinc
        });
    };
};

module.exports = Calls;