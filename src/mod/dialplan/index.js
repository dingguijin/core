/**
 * Created by i.navrotskyj on 26.01.2015.
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module),
    conf = require('../../conf'),
    PUBLIC_DIALPLAN_NAME = conf.get("mongodb:collectionPublic"),
    DEFAULT_DIALPLAN_NAME = conf.get("mongodb:collectionDefault"),
    expVal = require('./expressionValidator');

var Dialplan = {
    CreatePublic: function (req, res, next) {
        var dialCollection = db.getCollection(PUBLIC_DIALPLAN_NAME);
        var dialplan = req.body;
        Dialplan.replaceExpression(dialplan);
        dialplan['createdOn'] = new Date().toString();
        if (req['webitelDomain']) {
            dialplan['domain'] = req['webitelDomain'];
        };

        try {
            if (!dialplan['domain']) {
                res.status(400).send('domain is undefined');
                return;
            };
            Dialplan.findMaxVersion(dialplan['destination_number'], dialplan['domain'], dialCollection, function (err, result) {
                if (err) {
                    res.status(500).send(err.message);
                    return;
                };

                dialplan['version'] = (result && result[0])
                    ? result[0].maxVersion + 1
                    : 0;
                dialCollection.insert(dialplan, function (err) {
                    if (err) {
                        res.status(500).send(err.message);
                        return;
                    };
                    res.status(201).end();
                });
            });
        } catch (e) {
            res.status(500).send(e.message)
        }
    },
    
    CreateDefault: function (req, res, next) {
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        var dialplan = req.body;
        Dialplan.replaceExpression(dialplan);
        dialplan['createdOn'] = new Date().toString();
        if (req['webitelDomain']) {
            dialplan['domain'] = req['webitelDomain'];
        };
        if (!dialplan['order']) {
            dialplan['order'] = 0;
        };

        try {
            if (!dialplan['domain']) {
                res.status(400).send('domain is undefined');
                return;
            };

            dialCollection.insert(dialplan, function (err) {
                if (err) {
                    res.status(500).send(err.message);
                    return;
                };
                res.status(201).end();
            });


        } catch (e) {
            res.status(500).send(e.message)
        };
    },

    replaceExpression: function (obj) {
        if (obj)
            for (var key in obj) {
                if (typeof obj[key] == "object")
                    Dialplan.replaceExpression(obj[key]);
                else if (typeof obj[key] != "function" && key == "expression") {
                    obj["sysExpression"] = expVal(obj[key]);
                };
            };
        return;
    },

    findMaxVersion: function (number, domain_name, collection, cb) {
        if (!number || number == '') {
            cb(new Error('destination_number is undefined'));
            return;
        };
        collection.aggregate([ {
                $match: {
                    "destination_number": number,
                    "domain": domain_name
                }
            },
            {
                $group: {
                    _id: "$item",
                    maxVersion: { $max: "$version" }
                }
            }
        ], cb);
    },
    
    setupIndex: function () {
        var systemCollection = db.globalCollection;
        systemCollection.ensureIndex({"Core-UUID": -1}, function (err, res) {
            if (err) {
                log.error('Ensure index mongoDB: ' + err.message);
                return;
            };
            log.info('Ensure index %s mongoDB: OK', res)
        });
    },

    setupGlobalVariable: function (globalVarObject) {
        try {
            var systemCollection = db.globalCollection;
            Dialplan.setupIndex();
            //systemCollection.
            var _json = {},
                _param;
            var _body = globalVarObject['body'];
            if (_body) {
                _body.split('\n').forEach(function (str) {
                    _param = str.split('=');
                    if (_param[0] == '') return;
                    _json[_param[0]] = _param[1];
                });
            };
            globalVarObject.headers.forEach(function (param) {
                if (param.name == '') return;
                _json[param.name] = param.value;
            });

            systemCollection.remove({"Core-UUID": _json['Core-UUID']}, function (err) {
                if (err) {
                    log.error(err.message);
                    setTimeout(Dialplan.setupGlobalVariable(globalVarObject), 5000);
                    return;
                };
                systemCollection.insert(_json, function (err, res) {
                    if (err) {
                        log.error(err.message);
                        setTimeout(Dialplan.setupGlobalVariable(globalVarObject), 5000);
                        return;
                    };
                    log.info('setup global variable mongodb = OK');
                });
            });

        } catch (e) {
            log.error(e.message);
            setTimeout(Dialplan.setupGlobalVariable(globalVarObject), 5000);
        };
    }
};

module.exports = Dialplan;