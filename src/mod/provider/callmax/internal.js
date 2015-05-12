/**
 * Created by i.n. on 05.05.2015.
 */

var log = require('../../../lib/log')(module),
    db = require('../../../lib/mongoDrv'),
    conf = require('./conf'),
    DEFAULT_COLLECTION_NAME = conf.get("mongodb:collectionDefault");

module.exports = function (params, cb) {
    try {
        var _caller = {
            attr: {
                role: {
                    val: 2
                }
            }
        };
        var gwName = 'cm-' + params["name"];
        var option = {
            "name": gwName,
            "username": params["username"],
            "password": params["password"],
            "realm": params["realm"],
            "domain": params["domain"],
            "profile": "external",
            "params": [
                {
                    "name": "register",
                    "value": true
                },
                {
                    "name": "extension-in-contact",
                    "value": true
                },
                {
                    "name": "from-domain",
                    "value": params["domain"]
                }
            ]
        };

        webitel.createSipGateway(_caller, option, function (res) {
            try {
                if (!res || !res['body'] || res['body'].indexOf('+OK') !== 0) {
                    log.error('Create gw: ' + res && res['body'].replace(/\n/g, '\t'));
                    cb(new Error(res && res['body']));
                    return;
                }
                ;

                log.trace(res['body'].replace(/\n/g, '\t'));

                var dialPlan = {
                    "destination_number": "^(\\d{9,13})$",
                    "name": "cm-out",
                    "order": 20,
                    "domain": params["name"],
                    "callflow": [
                        {
                            "bridge": {
                                "endpoints": [
                                    {
                                        "type": "sipGateway",
                                        "name": gwName,
                                        "dialString": "&reg0.$1"
                                    }
                                ]
                            }
                        }
                    ],
                    "version": 2
                };
                var dialCollection = db.getCollection(DEFAULT_COLLECTION_NAME);
                dialCollection.insert(dialPlan, function (err, result) {
                    if (err) {
                        log.error(err['message']);
                        return;
                    }
                    ;
                    log.trace('Create dialplan OK: %s', result);
                    cb(null);
                });
            } catch (e) {
                log.error(e['message']);
                cb(e);
            };
        });
    } catch (e) {
        log.error(e['message']);
        cb(e);
    };
};