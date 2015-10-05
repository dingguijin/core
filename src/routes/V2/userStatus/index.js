/**
 * Created by i.navrotskyj on 05.10.2015.
 */
'use strict';
var log = require('../../../lib/log')(module),
    config = require('../../../conf'),
    AS_COLLECTION_NAME = config.get('mongodb:collectionAgentStatus'),
    ObjectId = require('mongodb').ObjectId,
    db = require('../../../lib/mongoDrv');

module.exports.Get = function (req, res, next) {
    let collection = db.getCollection(AS_COLLECTION_NAME);
    let filter = {},
        limit = parseInt(req.query['limit']) || 40,
        orderBy = {}
    ;

    collection
        .find(filter)
        .sort(orderBy)
        .limit(limit)
        .toArray(function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err.message
                });
            };

            return res.status(200).json({
                "status": "OK",
                "data": result
            })
        });
};