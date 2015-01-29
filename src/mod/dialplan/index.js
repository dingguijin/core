/**
 * Created by i.navrotskyj on 26.01.2015.
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module);

var Dialplan = {
    Create: function (req, res, next) {
        var dialCollection = db.dialplanCollection;
        var dialplan = req.body;
        dialplan['createdOn'] = new Date().toString();
        if (req['webitelDomain']) {
            dialplan['domain'] = req['webitelDomain'];
        };

        try {
            if (!dialplan['domain']) {
                res.status(400).send('domain is undefined');
                return;
            };
            Dialplan.findMaxVersion(dialplan['destination_number'], function (err, result) {
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

    findMaxVersion: function (number, cb) {
        if (!number || number == '') {
            cb(new Error('destination_number is undefined'));
            return;
        }
        var dialCollection = db.dialplanCollection;
        dialCollection.aggregate([ {
                $match: {
                    "destination_number": number
                }
            },
                {
                    $group:
                    {
                        _id: "$item",
                        maxVersion: { $max: "$version" }
                    }
                }
            ], cb);
    },
    setupGlobalVariable: function (globalVarObject) {
        try {
            var systemCollection = db.globalCollection;
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
            systemCollection.insert(_json, function (err, res) {
                if (err) {
                    log.error(err.message);
                    setTimeout(Dialplan.setupGlobalVariable(_jsonGlobalVarObject), 5000);
                    return;
                };
                log.info('setup global variable mongodb = OK');
            });
        } catch (e) {
            log.error(e.message);
            setTimeout(Dialplan.setupGlobalVariable(_jsonGlobalVarObject), 5000);
        }

    }
};

module.exports = Dialplan;