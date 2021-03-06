/**
 * Created by i.navrotskyj on 26.01.2015.
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module),
    conf = require('../../conf'),
    PUBLIC_DIALPLAN_NAME = conf.get("mongodb:collectionPublic"),
    DEFAULT_DIALPLAN_NAME = conf.get("mongodb:collectionDefault"),
    EXTENSION_DIALPLAN_NAME = conf.get("mongodb:collectionExtension"),
    DOMAIN_VAR_DIALPLAN_NAME = conf.get("mongodb:collectionDomainVar"),
    expVal = require('./expressionValidator'),
    url = require("url"),
    ObjectID = require('mongodb').ObjectID,
    SYSTEM_COLLECTION_NAME = conf.get("mongodb:collectionSystem");

function getDomainFromRequest (request, defDomain) {
    try {
        if (request['webitelUser'] && request['webitelUser']['domain']) {
            return request['webitelUser']['domain'];
        } else {
            return defDomain;
        };
    } catch (e) {
        log.error(e.message);
    };
};

function removeDialplanFromDomain(collectionName, domain) {
    try {
        var dialCollection = db.getCollection(collectionName);
        dialCollection.remove({"domain": domain}, function (err, result) {
            if (err) {
                log.error(err['message']);
                return;
            }
            ;
            log.debug('Remove %s from domain %s : %s', collectionName, domain, result);
        });
    } catch (e) {
        log.error(e['message']);
    };
};

var _root = {
    attr: {
        role: {
            val: 2
        }
    }
};

moduleEventEmitter.on("webitel::DOMAIN_DESTROY", function (evnt) {
    var domain = evnt['Domain-Name'];
    if (!domain) {
        log.error('Domain null!');
        return;
    };
    try {
        removeDialplanFromDomain(PUBLIC_DIALPLAN_NAME, domain);
        removeDialplanFromDomain(DEFAULT_DIALPLAN_NAME, domain);
        removeDialplanFromDomain(EXTENSION_DIALPLAN_NAME, domain);
        removeDialplanFromDomain(DOMAIN_VAR_DIALPLAN_NAME, domain);

        webitel.showSipGateway(_root, domain, function (res) {
            if (!res || !res['body']) {
                log.error('Get gateway from domain error.');
                return;
            }
            ;

            webitel._parsePlainTableToJSONArray(res['body'], function (err, res) {
                if (err) {
                    log.error(err['message']);
                    return;
                }
                ;
                for (var key in res) {
                    try {
                        webitel.removeSipGateway(_root, res[key]['Gateway'].replace(/(.*)(\:\:)/, ''), function (res) {
                            if (res && res['body']) {
                                log.trace(res['body']);
                            }
                            ;
                        });
                    } catch (e) {
                        log.error(e['message']);
                    }
                    ;
                }
                ;
            });
        });
    } catch (e) {
        log.error(e['message']);
    }
});

var Dialplan = {
    /**
     * Internal extension
     */
    GetExtensions: function (req, res, next) {
        var dialCollection = db.getCollection(EXTENSION_DIALPLAN_NAME);
        Dialplan.getDialplan(req, res, next, dialCollection);
    },

    UpdateExtension: function (req, res, next) {
        var _id = req.params['id'],
            callflow = req.body['callflow'],
            timezone = req.body['timezone'],
            timezonename = req.body['timezonename'],
            extension = {
                "$set": {}
            }
            ;
        if (!_id || req.body['destination_number'] || req.body['domain'] || req.body['userRef'] || req.body['version']) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request!"
            });
            return;
        };

        for (var key in req.body) {
            if (key == 'callflow')
                Dialplan.replaceExpression(req.body[key]);
            extension.$set[key] = req.body[key];
        };

        var dialCollection = db.getCollection(EXTENSION_DIALPLAN_NAME);
        dialCollection.findAndModify({"_id": new ObjectID(_id)}, [], extension, function (err, result) {
            if (err) {
                res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
                return;
            };
            res.status(200).json(result);
        });
    },

    /**
     * Domain variables
     */

    GetDomainVariable: function (req, res, next) {
        try {
            var dialCollection = db.getCollection(DOMAIN_VAR_DIALPLAN_NAME);
            Dialplan.getDialplan(req, res, next, dialCollection);
        } catch (e) {
            next(e);
        }
    },

    InsertOrUpdateDomainVariable: function (req, res, next) {
        var doc = {
                "variables": req.body
            },
            collection = db.getCollection(DOMAIN_VAR_DIALPLAN_NAME)
        ;
        doc['domain'] =  getDomainFromRequest(req, req.query['domain']);

        if (!doc['domain']) {
            res.status(400).json({
                "status": "error",
                "info": "domain is undefined"
            });
            return;
        };

        collection.update({
                "domain": doc['domain'] },
            doc,
            {upsert: true},
            function (err, result) {
                if (err) {
                    return next(err);
                };
                res.status(200).json({
                    "status": "OK",
                    "data": result
                })
            }
        );
    },

    /*
     * Public dialplan.
     */

    CreatePublic: function (req, res, next) {
        var dialCollection = db.getCollection(PUBLIC_DIALPLAN_NAME);
        var dialplan = req.body;
        Dialplan.replaceExpression(dialplan);
        dialplan['createdOn'] = new Date().toString();

        // TODO проверка на номер
        /**
         ALPHA / DIGIT / "-" / "_" / "." / "+" / "="
         The US-ASCII coded character set
         is defined by ANSI X3.4-1986.
         **/

        dialplan['domain'] =  getDomainFromRequest(req, dialplan['domain']);

        try {
            if (!dialplan['domain']) {
                res.status(400).json({
                    "staus": "error",
                    "info": "Domain is required."
                });
                return;
            };

            dialplan['version'] = 2;

            dialCollection.insert(dialplan, function (err, result) {
                if (err) {
                    res.status(200).json({
                        "status": "error",
                        "code": err['code'],
                        "info": err.message
                    });
                    //res.status(500).send(err.message);
                    return;
                };
                res.status(200).json({
                    "status": "OK",
                    "info": result[0]['_id'].toString()
                });
            });
        } catch (e) {
            res.status(500).json({
                "status": "error",
                "info": e.message
            });
        }
    },

    GetPublicDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(PUBLIC_DIALPLAN_NAME);
        Dialplan.getDialplan(req, res, next, dialCollection);
    },

    DeletePublicDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(PUBLIC_DIALPLAN_NAME);
        Dialplan.removeDialplan(req, res, next, dialCollection);
    },

    UpdatePublicDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(PUBLIC_DIALPLAN_NAME);
        Dialplan.updateDialplan(req, res, next, dialCollection);
    },

    /*
     * Default dialplan.
     */
    
    CreateDefault: function (req, res, next) {
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        var dialplan = req.body;
        Dialplan.replaceExpression(dialplan);
        dialplan['createdOn'] = new Date().toString();

        dialplan['domain'] = getDomainFromRequest(req, dialplan['domain']);

        if (!dialplan['order']) {
            dialplan['order'] = 0;
        };
        dialplan['version'] = 2;

        try {
            if (!dialplan['domain']) {
                res.status(400).json({
                    "status": "error",
                    "info": 'Domain is required.'
                });
                return;
            };

            dialCollection.insert(dialplan, function (err, result) {
                if (err) {
                    res.status(200).json({
                        "status": "error",
                        "code": err['code'],
                        "info": err.message
                    });
                    //res.status(500).send(err.message);
                    return;
                };
                // TODO
                res.status(200).json({
                    "status": "OK",
                    "info": result[0]['_id'] && result[0]['_id'].toString()
                });
            });


        } catch (e) {
            res.status(500).json({
                "status": "error",
                "info": e.message
            });
        };
    },
    
    GetDefaultDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        Dialplan.getDialplan(req, res, next, dialCollection);
    },

    DeleteDefaultDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        Dialplan.removeDialplan(req, res, next, dialCollection);
    },

    UpdateDefaultDialplan: function (req, res, next) {
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        Dialplan.updateDialplan(req, res, next, dialCollection);
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
        var systemCollection = db.getCollection(SYSTEM_COLLECTION_NAME);
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

            systemCollection.remove({"FreeSWITCH-Switchname": _json['FreeSWITCH-Switchname']}, function (err) {
                if (err) {
                    log.error(err.message);
                    setTimeout(function() {Dialplan.setupGlobalVariable(globalVarObject)}, 5000);
                    return;
                };
                systemCollection.insert(_json, function (err, res) {
                    if (err) {
                        log.error(err.message);
                        setTimeout(function() {Dialplan.setupGlobalVariable(globalVarObject)}, 5000);
                        return;
                    };
                    log.info('setup global variable mongodb = OK');
                });
            });

        } catch (e) {
            log.info(e.message);
            setTimeout(function() {Dialplan.setupGlobalVariable(globalVarObject)}, 5000);
        };
    },
    
    getDialplan: function (req, res, next, dialCollection) {
        var parts = url.parse(req.url, true, true),
            query = parts.query,
            _domain = query.domain,
            dbQuery = {
                "domain": _domain
            };

        dbQuery['domain'] = getDomainFromRequest(req, dbQuery['domain']);

        dialCollection.find(dbQuery)
            .sort({"order": 1})
            .toArray(function (err, collection) {
                if (err) {
                    next(err);
                    return;
                };
                // TODO
                res.json(collection);
            });
    },
    
    removeDialplan: function (req, res, next, dialCollection) {
        var _id = req.params['id'];
        if (!_id) {
            res.status(400).send('id is undefined');
            return;
        };
        dialCollection.remove({"_id": new ObjectID(_id)}, function (err, result) {
            if (err) {
                res.status(500).send(err.message);
                return;
            };
            res.status(200).send('Deleted');
        });
    },

    updateDialplan: function (req, res, next, dialCollection) {
        var _id = req.params['id'],
            dialplan = req.body;
        if (!_id) {
            res.status(400).send('id is undefined');
            return;
        };
        Dialplan.replaceExpression(dialplan);
        dialplan['version'] = 2;
        dialCollection.findAndModify({"_id": new ObjectID(_id)}, [], dialplan, function (err, result) {
            if (err) {
                res.status(500).send(err.message);
                return;
            };
            res.status(200).json(result);
        });
    },

    incOrderDefault: function (req, res, next) {
        var domainName = req.params['domainName'],
            _body = req.body,
            inc = parseInt(_body['inc']),
            start = parseInt(_body['start']);
        if (!domainName || isNaN(inc) || isNaN(start)) {
            next(new Error('Bad request'));
            return ;
        };
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);

        dialCollection.update({
            "domain": domainName,
            "order": {
                "$gt": start
            }
        }, {$inc: {"order": inc}}, {multi: true}, function (err, result) {
            if (err) {
                next(err);
                return;
            };
            res.status(200).json({
                "status": 'OK',
                "info": result
            });
        });
    },
    
    setOrderDefault: function (req, res, next) {
        var _id = req.params['id'],
            order = parseInt(req.body['order']);

        if (isNaN(order)) {
            res.status(400).json({
                "status": "error",
                "info": "Bad order parameters"
            });
            return;
        };
        var dialCollection = db.getCollection(DEFAULT_DIALPLAN_NAME);
        dialCollection.update({"_id": new ObjectID(_id)}, {"$set": {"order": order}}, function (err, result) {
            if (err) {
                res.status(500).send(err.message);
                return;
            };
            res.status(200).json(result);
        });
    }
};

module.exports = Dialplan;