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
        collection.findAndModify(
            {"account": data['account'], "domain": data['domain']},
            {"date": -1},
            {"$set": {"endDate": data['date']}},
            {limit: 1},
            (err, result) => {
                if (err)
                    return log.error(err);
                if ((!data['status'] || !data['state']) && result && result['status'] && result['state']) {
                    data['status'] = result['status'];
                    data['state'] = result['state'];
                    data['description'] = result['description'] || "";
                };
                collection
                    .insert(data, (err) => {
                        if (err)
                            log.error(err);
                    });
            }
        );

        // region TODO bulk...
        /*
        var bulk = collection.initializeOrderedBulkOp();
        bulk.find({"account": data['account'], "domain": data['domain']}, {limit: 1, sort: {"date": -1}})
            .updateOne({"$set": {"endDate": data['date']}})
        ;
        bulk.insert(data);

        bulk.execute(function (err) {
            if (err)
                log.error(err);

        });
        */
        // endregion
    } catch (e) {
        log.error(e);
    };
};