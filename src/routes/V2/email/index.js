/**
 * Created by i.n. on 09.07.2015.
 */

var log = require('../../../lib/log')(module),
    conf = require('../../../conf'),
    email = require('../../../middleware/email'),
    emailCollectionName = conf.get('mongodb:collectionEmail'),
    db = require('../../../lib/mongoDrv');

var EmailSettings = {
    get: function (req, res, next) {
        var collection = db.getCollection(emailCollectionName);
        var caller = req.webitelUser || {};
        var domain = caller.attr['domain'] || req.query['domain'];

        if (caller.attr.role.val < 1) {
            return res.status(403).end();
        };

        if (!domain) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request (domain required)."
            });
            return;
        };

        collection.findOne({"domain": domain}, function (err, result) {
            if (err) {
                next(err);
                return;
            };

            if (!result) {
                return res.status(404).json({
                    "status": "error",
                    "info": "Not found!"
                });
            }
            res.status(200).json(result);
            return;
        });
    },

    set: function (req, res, next) {
        var collection = db.getCollection(emailCollectionName);
        var caller = req.webitelUser || {};

        if (caller.attr.role.val < 1) {
            return res.status(403).end();
        };

        var domain = caller.attr['domain'] || req.query['domain'];
        var settings = req.body;
        if (!domain || !settings || !settings['provider'] || !settings['options']) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request."
            });
            return;
        };

        settings["domain"] = domain;

        collection.update(
            {"domain": domain},
            settings,
            {upsert: true},
            function (err, result) {
                if (err) {
                    next(err);
                    return;
                };

                collection.findOne({"domain": domain}, function (err, result) {
                    if (err) {
                        next(err);
                        return;
                    };

                    res.status(200).json(result);
                    return;
                });
        });
    },

    validateSmtp: function (doc) {
        if (!doc || !doc['options']) {
            return false;
        };
        var requiredOptions = ['host', ''];
        var options = doc['options'];
    },

    delete: function (req, res, next) {
        var collection = db.getCollection(emailCollectionName);
        var caller = req.webitelUser || {};

        if (caller.attr.role.val < 1) {
            return res.status(403).end();
        };

        var domain = caller.attr['domain'] || req.query['domain'];
        if (!domain) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request."
            });
            return;
        };

        collection.remove({"domain": domain}, function (err, result) {
            if (err) {
                next(err);
                return;
            };

            res.status(200).json({
                "status": "OK",
                "Info": "Removed " + result + " record."
            });
            return;
        });
    },

    update: function (req, res, next) {
        var collection = db.getCollection(emailCollectionName);
        var caller = req.webitelUser || {};

        if (caller.attr.role.val < 1) {
            return res.status(403).end();
        };

        var domain = caller.attr['domain'] || req.query['domain'];
        if (!domain) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request."
            });
            return;
        };

        var settings = req.body;
        settings['domain'] = domain;

        collection.update({"domain": domain}, settings, function (err, result) {
            if (err) {
                next(err);
                return;
            };
            if (result === 0) {
                return res.status(400).json({
                    "status": "error",
                    "info": "Not found!"
                });
            };

            collection.findOne({"domain": domain}, function (err, result) {
                if (err) {
                    next(err);
                    return;
                };

                res.status(200).json(result);
                return;
            });
        });
    },

    sendHelloMessage: function (req, res, next) {
        var caller = req.webitelUser || {"attr": {}};
        var domain = caller.attr['domain'] || req.query['domain'];

        if (caller.attr.role.val < 1) {
            return res.status(403).end();
        };

        email.send(
            {
                "to": req.params['to'] || req.body['to'],
                "subject": "Webitel",
                "html": "<h1>Helo from <img href=\"webitel.com\" src=\"cid:logoID\"/> </h1>",
                "attachments": [{
                    "filename": "logo768.png",
                    "path": "src/resource/img/logo.png",
                    "cid": "logoID"
                }]
            },
            domain,
            function (err, info) {
                if (err) {
                    res.status(500).json({
                        "status": "error",
                        "info": err['message']
                    });
                    return;
                };

                res.status(200).json({
                    "status": "OK",
                    "info": info
                });
        });
    },

    Message: '' +
    "<pre>" +
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
        "&nbsp;&nbsp;eb&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;e&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lW&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;We&nbsp;&nbsp;&nbsp;&nbsp;l&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;el&nbsp;&nbsp;" +
        "&nbsp;&nbsp;te&nbsp;&nbsp;&nbsp;&nbsp;ite&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;bi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;eb&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;eb&nbsp;&nbsp;" +
        "&nbsp;&nbsp;We&nbsp;&nbsp;&nbsp;&nbsp;lWe&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;el&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;te&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;te&nbsp;&nbsp;" +
        "&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;&nbsp;bit&nbsp;lWebit&nbsp;&nbsp;&nbsp;ebitel&nbsp;&nbsp;bi&nbsp;elWebi&nbsp;elWebi&nbsp;&nbsp;&nbsp;We&nbsp;&nbsp;" +
        "&nbsp;&nbsp;lW&nbsp;&nbsp;&nbsp;&nbsp;elW&nbsp;bi&nbsp;&nbsp;lW&nbsp;&nbsp;&nbsp;te&nbsp;&nbsp;eb&nbsp;&nbsp;el&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;eb&nbsp;&nbsp;el&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;" +
        "&nbsp;&nbsp;bi&nbsp;el&nbsp;ebi&nbsp;elWebi&nbsp;&nbsp;&nbsp;We&nbsp;&nbsp;te&nbsp;&nbsp;eb&nbsp;&nbsp;&nbsp;lW&nbsp;&nbsp;&nbsp;telWeb&nbsp;&nbsp;&nbsp;lW&nbsp;&nbsp;" +
        "&nbsp;&nbsp;elWebitel&nbsp;ebite&nbsp;&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;We&nbsp;&nbsp;te&nbsp;&nbsp;&nbsp;bi&nbsp;&nbsp;&nbsp;Webit&nbsp;&nbsp;&nbsp;&nbsp;bi&nbsp;&nbsp;" +
        "&nbsp;&nbsp;ebi&nbsp;&nbsp;lWeb&nbsp;te&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lW&nbsp;&nbsp;it&nbsp;&nbsp;We&nbsp;&nbsp;&nbsp;el&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;el&nbsp;&nbsp;" +
        "&nbsp;&nbsp;&nbsp;e&nbsp;&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;ebite&nbsp;&nbsp;&nbsp;bitel&nbsp;&nbsp;&nbsp;it&nbsp;&nbsp;&nbsp;eb&nbsp;&nbsp;&nbsp;&nbsp;Webit&nbsp;&nbsp;&nbsp;eb&nbsp;&nbsp;" +
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
    "</pre>"
};

module.exports.EmailSettings = EmailSettings;

