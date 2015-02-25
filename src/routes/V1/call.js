/**
 * Created by i.n. on 24.02.2015.
 */

var log = require('../../lib/log')(module);

module.exports.Originate = function (req, res, next) {

    var extension = req.body.calledId, // CALLE
        user = req.body.callerId, //CALLER
        auto_answer_param = req.body.auto_answer_param;

    var _originatorParam = new Array('w_jsclient_originate_number=' + extension),
        _autoAnswerParam = [].concat( auto_answer_param || []),
        _param = '[' + _originatorParam.concat(_autoAnswerParam).join(',') + ']';

    var dialString = ('originate ' + _param + 'user/' + user + ' ' + extension +
        ' xml default ' + user + ' ' + user);
    log.trace(dialString);

    eslConn.bgapi(dialString, function (result) {
        sendResponse(result, res, "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Создатьканал.");
    });
};

module.exports.HupAll = function (req, res, next) {
    eslConn.bgapi('hupall', function (result) {
        sendResponse(result, res, "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Завершитьвсеканалы.");
    });
};

module.exports.KillUuid = function (req, res, next) {
    var params = req.params,
        uuid = params['id'],
        docsLink = "https://docs.webitel.com/display/SDKRU/REST+API+v1#RESTAPIv1-Завершить.";

    if (uuid) {
        eslConn.bgapi('uuid_kill ' + uuid, function (result) {
            sendResponse(result, res, docsLink);
        });
    } else {
        res.status(400).json({
            "status": "bad request",
            "info": "Bad parameters channel id",
            "more info": docsLink
        });
    };
};

module.exports.ChangeState = function (req, res, next) {
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
                "status": "bad request",
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
            "status": "bad request",
            "info": "Bad parameters channel id or state",
            "more info": docUrlInfo
        });
    };
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