/**
 * Created by i.n. on 07.04.2015.
 */

var url = require("url"),
    log = require('../../../lib/log')(module),
    rUtil = require('../../../lib/requestUtil');

var API = {
    Create: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = req.body;
        _q['domain']= req.query['domain'];
        webitel.queueCreate(req.webitelUser, _q, function (request) {
            res.status(200).json({
                "status": request['body'] && request['body'].indexOf('-ERR') == 0 ? "error" : "OK",
                "info": request['body']
            });
            //res.status(200).json(rUtil.getRequestObject((request['body'] && request['body'].indexOf('-ERR') == 0)
            //    ? "error" : "OK", request['body'], ''));
        });
    },

    List: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        webitel.queueList(req.webitelUser, req.query, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
                && request['body'].indexOf('-ERR') == 0)
                    ? "error" : "OK", request['body'], ''));
        });
    },

    Item: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "name": req.params['name'],
            "domain": req.query['domain']
        };
        webitel.queueItem(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    Update: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "name": req.params['name'],
            "domain": req.query['domain'],
            "params": req.body
        };
        webitel.queueUpdateItem(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    Delete: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "name": req.params['name'],
            "domain": req.query['domain']
        };
        webitel.queueDelete(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    SetState: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "name": req.params['name'],
            "domain": req.query['domain'],
            "state": req.params['state']
        };
        webitel.queueUpdateItemState(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    GetTier: function (req, res, next) {
        var queue = req.params['queue'] + '@' + (req.webitelUser['attr']['domain'] || req.query['domain']);
        eslConn.bgapi('callcenter_config queue list agents ' + queue, function (result) {

            webitel._parsePlainTableToJSONArray(result['body'], function (err, resJSON) {
                if (err) {
                    res.status(500).json({
                        "status": "error",
                        "info": err['message']
                    });
                    return;
                };
                res.status(200).json({
                    "status": "OK",
                    "info": resJSON
                });

            }, '|');
        });
    },

    PostTier: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "queue": req.params['queue'],
            "agent": req.body['agent'],
            "domain": req.query['domain'],
            "level": req.body['level'],
            "position": req.body['position']
        };
        webitel.tierCreate(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    PutLevel: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "queue": req.params['queue'],
            "agent": req.params['agent'],
            "domain": req.query['domain'],
            "level": req.body['level']
        };
        webitel.tierSetLvl(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    PutPosition: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "queue": req.params['queue'],
            "agent": req.params['agent'],
            "domain": req.query['domain'],
            "position": req.body['position']
        };
        webitel.tierSetPos(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    },

    DeleteTier: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        var _q = {
            "queue": req.params['queue'],
            "agent": req.params['agent'],
            "domain": req.query['domain']
        };
        webitel.tierRemove(req.webitelUser, _q, function (request) {
            res.status(200).json(rUtil.getRequestObject((request['body'] && typeof request['body'] === 'string'
            && request['body'].indexOf('-ERR') == 0)
                ? "error" : "OK", request['body'], ''));
        });
    }
};

module.exports = API;