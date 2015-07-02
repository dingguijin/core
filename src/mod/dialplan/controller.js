/**
 * Created by i.navrotskyj on 09.04.2015.
 */

/**
 * Internal extension route;
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module),
    conf = require('../../conf'),
    EXTENSION_COLLECTION_NAME = conf.get('mongodb:collectionExtension')
    ;

var Controller = {

    setUserCallForward: function (userId, domainName, number, cb) {
        var collection = db.getCollection(EXTENSION_COLLECTION_NAME);
        collection.findOne({
            "domain": domainName,
            "userRef": userId + '@' + domainName
        }, function (err, res) {
            if (err) {
                cb(err);
                return;
            };

            console.dir(res);
        });
    },

    createUser: function (userId, number, domain, cb) {
        Controller.existsNumber(number, domain, function (err, exists) {
            if (err) {
                return cb(err);
            };
            if (exists) {
                log.warn('Add number in extension collection exists.');
                return cb(new Error('Number exists'));
            };
            //Controller.addNumber(number, domain, cb);
        });
    },

    existsNumber: function (number, domain, cb) {
        var collection = db.getCollection(EXTENSION_COLLECTION_NAME);
        var _numberArray;
        // TODO проверка на пробелы
        if (number instanceof Array) {
            _numberArray = number;
        } else {
            _numberArray = [number];
        };
        collection.findOne({
            "destination_number": {
                "$in": _numberArray
            },
            "domain": domain
        }, function (err, res) {
            if (err) {
                return cb(err);
            };
            cb(null, res ? true : false);
        });
    },

    createNumber: function (userId, number, domain, cb) {
        try {
            var collection = db.getCollection(EXTENSION_COLLECTION_NAME);
            var _userExtension = getTemplateExtension(userId, number, domain);
            collection.insert(_userExtension, cb);
        } catch (e) {
            cb(e);
        }
        ;
    },
    
    deleteNumber: function (number, domain, cb) {
        var collection = db.getCollection(EXTENSION_COLLECTION_NAME);
        collection.remove({
            "userRef": number + '@' + domain
        }, cb);
    },
    
    updateOrInsertNumber: function (userId, number, domain, cb) {
        try {
            var collection = db.getCollection(EXTENSION_COLLECTION_NAME);
            var _userExtension = getTemplateExtension(userId, number, domain);
            collection.update({
                "userRef": userId + '@' + domain },
                _userExtension,
                {upsert: true},
                cb
            );
        } catch (e) {
            cb(e);
        };
    },

    /**
     * импорт пользователей в базу
     */
    syncData: function () {
    }
};

// @@private
function getTemplateExtension(id, number, domain) {
    return {
        "destination_number": number,
        "domain": domain,
        "userRef": id + '@' + domain,
        "name": "ext_" + number,
        "version": 2,
        "callflow": [
            {
                "setVar": [ "ringback=$${us-ring}", "transfer_ringback=$${uk-ring}","hangup_after_bridge=true",
                    "continue_on_fail=true"]
            },
            {
                "recordSession": "start"
            },
            {
                "bridge": {
                    "endpoints": [{
                        "name": number,
                        "type": "user"
                    }]
                }
            },
            {
                "recordSession": "stop"
            },
            {
                "answer": ""
            },
            {
                "sleep": "1000"
            },
            {
                "voicemail": {
                    "user": number
                }
            }
        ]
    }
};

function getTemplateExtensionCallForwarding(id, domain, number, cfNumber) {
    return {
        "destination_number": number,
        "domain": domain,
        "userRef": id + '@' + domain,
        "name": "ext_" + number,
        "version": 2,
        "callflow": [
            {
                "setUser": number
            },
            {
                "goto": "default:" + cfNumber
            }
        ]
    };
}

module.exports = Controller;

moduleEventEmitter.on('webitel::USER_DESTROY', function (e) {
    Controller.deleteNumber(e['User-ID'], e['User-Domain'], function (err, res) {
        if (err)
            return log.error('Remove number %s (%s) db: %s',e['User-ID'], e['User-Domain'], err['message']);
        log.debug('Remove number %s (%s) db: %s',e['User-ID'], e['User-Domain'], res);
    });
});

//moduleEventEmitter.on('webitel::ACCOUNT_STATUS', function (e) {
//    var user = Users.get(e['Account-User'] + '@' + e['Account-Domain']);
//    if (!user) return;
//
//    if (e['Account-Status'] == 'CALLFORWARD' && e['Account-Status-Descript']) {
//        log.info('ENABLE CALLFORWARD');
//        Controller.setUserCallForward(e['Account-User'], )
//
//    } else if (user['status'] == 'CALLFORWARD') {
//        log.info('DISABLE CALLFORWARD');
//    };
//    user['status'] = e['Account-Status'];
//});

