/**
 * Created by i.navrotskyj on 02.10.2015.
 */
'use strict';

var log = require('../lib/log')(module),
    config = require('../conf'),
    AS_COLLECTION_NAME = config.get('mongodb:collectionAgentStatus'),
    db = require('../lib/mongoDrv')
;

module.exports = function (data) {
    try {
        var collection = db.getCollection(AS_COLLECTION_NAME);
        collection
            .insert(data, function (err) {
                if (err)
                    log.error(err);
            });
    } catch (e) {
        log.error(e);
    };
};