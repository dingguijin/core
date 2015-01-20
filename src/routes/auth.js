var jwt = require('jwt-simple'),
    config = require('../conf/index'),
    redis = require("redis"),
    DB_INDEX = config.get('redis:db_index'),
    client = redis.createClient(config.get('redis:port'), config.get('redis:host'), {}),
    log = require('../lib/log')(module),
    checkUser = require('./../middleware/checkUser'),
    crypto = require('crypto');

client.on('error', function (err) {
    log.error(err.message || 'Redis server ERROR!');
});

client.select(DB_INDEX, function (err) {
    if (err) throw err;
    log.info('Select database: ', DB_INDEX);
});

client.on('connect', function () {
    log.info('Connected db redis: ' + this.address);
});

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
    
    validate: function (username, password, _id, cb) {
        checkUser(username, password, function (err, user) {
            if (err) {
                log.warn(err);
                cb(err);
                return;
            };
            var tokenObj = genToken(username),
                userObj = {
                    "domain": user.domain,
                    "expires": tokenObj.expires,
                    "token": tokenObj.token,
                    "role": user.role.val
                };

            if (client.connected) {
                client.set('session:' + _id, JSON.stringify(userObj), function (err) {
                    if (err) {
                        log.error(err);
                        cb(err);
                        return;
                    };
                    userObj['key'] = _id;
                    cb(null, userObj);
                });
            } else {
                cb('Connected redis error.');
            }
        });
    },

    getTokenObject: function(username, password, ip, cb) {
        var _id = md5(username + ':' + ip);
        auth.validate(username, password, _id, cb);
    },

    validateUser: function (key, cb) {
        try {
            if (client.connected) {
                client.get('session:' + key, function (err, dbUser) {
                    if (err) {
                        log.error(err.message);
                        cb(err);
                        return;
                    }
                    ;
                    cb(null, JSON.parse(dbUser));
                });
            } else {
                cb('Connected redis error.');
            }
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