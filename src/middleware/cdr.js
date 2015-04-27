/**
 * Created by i.navrotskyj on 27.04.2015.
 */

var db = require('../lib/mongoDrv'),
    conf = require('../conf'),
    CDR_SERVER_URL = conf.get("cdrServer:host"),
    CDR_FILE_COLLECTION_NAME = conf.get('mongodb:collectionFile')
    ;

var API = {
    existsRecordFile: function (uuid, cb) {
        try {
            if (!uuid) {
                return cb(null, false);
            };

            var collection = db.getCollection(CDR_FILE_COLLECTION_NAME);
            collection.findOne({
                "uuid": uuid
            }, function (err, res) {
                if (err) {
                    return cb(err);
                };

                return cb(null, !!res);
            });
        } catch (e) {
            return cb(e);
        };
    },

    Route: {
        GetFile: "/api/v2/files/",
        Root: CDR_SERVER_URL
    }
};

module.exports = API;