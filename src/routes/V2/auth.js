var jwt = require('jwt-simple'),
    config = require('../../conf/index'),
    AUTH_DB_NAME = config.get("mongodb:collectionAuth"),
    log = require('../../lib/log')(module),
    checkUser = require('./../../middleware/checkUser'),
    crypto = require('crypto'),
    mongoDb = require('../../lib/mongoDrv'),
    generateUuid = require('node-uuid');

var auth = {

    login: function(req, res, next) {

        var username = req.body.username || '';
        var password = req.body.password || '';

        if (username == '') {
            res.status(401);
            res.json({
                "status": 401,
                "message": "Invalid credentials"
            });
            return;
        };

        // Fire a query to your DB and check if the credentials are valid
        auth.getTokenObject(username, password, function (err, dbUserObj) {
            if (err) {
                res.status(401);
                res.json({
                    "status": 401,
                    "message": "Invalid credentials"
                });
                return;
            };
            if (dbUserObj) {
                res.json(dbUserObj);
            };
        });
    },

    logout: function (req, res, next) {
        try {
            var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
            var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
            if (!key || !token) {
                res.status(401);
                res.json({
                    "status": 401,
                    "message": "Invalid credentials"
                });
                return;
            };
            auth.validateUser(key, function (err, user) {
                if (err) {
                    next(err);
                    return;
                };
                if (user && user['token'] == token) {
                    auth.removeKey(key, function (err, result) {
                        if (err) {
                            next(err);
                            return;
                        };
                        res.status(200).json({
                            "status": "OK",
                            "info": "Successful logout."
                        });
                    });
                } else {
                    res.status(401);
                    res.json({
                        "status": 401,
                        "message": "Invalid credentials"
                    });
                    return;
                };
            });
        } catch (e) {
            next(e);
        }
    },

    insertDb: function (data, cb) {
        var _db = mongoDb.getCollection(AUTH_DB_NAME);
        _db.findAndModify({"key": data['key']}, [], data, {"upsert": true}, cb);
    },

    selectDbUser: function (key, cb) {
        var _db = mongoDb.getCollection(AUTH_DB_NAME);
        _db.findOne({"key": key}, cb);
    },
    
    validate: function (username, password, _id, cb) {
        checkUser(username, password, function (err, user) {
            if (err) {
                log.warn(err);
                cb(err);
                return;
            };
            var tokenObj = genToken(username),
                userObj = {
                    "key": _id,
                    "domain": user.domain,
                    "username": username,
                    "expires": tokenObj.expires,
                    "token": tokenObj.token,
                    "role": user.role.val
                };

            auth.insertDb(userObj, function (err) {
                if (err) {
                    log.error(err);
                    cb(err);
                    return;
                };
                cb(null, userObj);
            });
        });
    },

    getTokenObject: function(username, password, cb) {
        var _id = generateUuid.v4();
        auth.validate(username, password, _id, cb);
    },
    
    getTokenWS: function (_caller, cb) {
        try {
            var _db = mongoDb.getCollection(AUTH_DB_NAME)
                ;
            _db.findOne({
                "username": _caller['id'],
                "expires": {
                    "$gt": new Date().getTime()
                }
            }, function (err, res) {
                if (err)
                    return cb(err);
                if (res) {
                    return cb(null, res);
                } else {
                    try {
                        var _id = generateUuid.v4();
                        var tokenObj = genToken(_caller['id']),
                            userObj = {
                                "key": _id,
                                "domain": _caller['attr']['domain'],
                                "username": _caller['id'],
                                "expires": tokenObj.expires,
                                "token": tokenObj.token,
                                "role": _caller['attr']['role']['val']
                            };

                        auth.insertDb(userObj, function (err) {
                            if (err) {
                                log.error(err);
                                cb(err);
                                return;
                            }
                            ;
                            cb(null, userObj);
                        });
                    } catch (e) {
                        return cb(e);
                    };
                };
            });
        } catch (e) {
            cb(e);
        }
    },

    validateUser: function (key, cb) {
        try {
            auth.selectDbUser(key, function (err, dbUser) {
                if (err) {
                    log.error(err.message);
                    cb(err);
                    return;
                };
                cb(null, dbUser);
            });
        } catch (e){
            cb(e);
        }
    },
    
    removeKey: function (key, cb) {
        try {
            var _db = mongoDb.getCollection(AUTH_DB_NAME);
            _db.remove({
                "$or": [{
                    "expires": {
                        "$lt": new Date().getTime()
                    }
                },
                    {
                        "key": key
                    }
                ]
            }, cb);
        } catch (e) {
            cb(e);
        }
    }
};

// private method
function genToken(user) {
    var expires = expiresIn(config.get('application:auth:expiresDays'));
    var token = jwt.encode({
        exp: expires
    }, config.get('application:auth:tokenSecretKey'));

    return {
        token: token,
        expires: expires,
        user: user
    };
};

function expiresIn(numDays) {
    var dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
};

var md5 = function (str) {
    var hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
};

module.exports = auth;