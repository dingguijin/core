var jwt = require('jwt-simple'),
    config = require('../../conf/index'),
    AUTH_DB_NAME = config.get("mongodb:collectionAuth"),
    log = require('../../lib/log')(module),
    checkUser = require('./../../middleware/checkUser'),
    crypto = require('crypto'),
    mongoDb = require('../../lib/mongoDrv');

var auth = {

    login: function(req, res, next) {

        var username = req.body.username || '';
        var password = req.body.password || '';

        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        if (username == '') {
            res.status(401);
            res.json({
                "status": 401,
                "message": "Invalid credentials"
            });
            return;
        };

        // Fire a query to your DB and check if the credentials are valid
        auth.getTokenObject(username, password, ip, function (err, dbUserObj) {
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

    getTokenObject: function(username, password, ip, cb) {
        var _id = md5(username + ':' + ip);
        auth.validate(username, password, _id, cb);
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