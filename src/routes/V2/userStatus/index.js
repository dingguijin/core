/**
 * Created by i.navrotskyj on 05.10.2015.
 */
'use strict';
var log = require('../../../lib/log')(module),
    config = require('../../../conf'),
    AS_COLLECTION_NAME = config.get('mongodb:collectionAgentStatus'),
    ObjectId = require('mongodb').ObjectId,
    db = require('../../../lib/mongoDrv');

module.exports.Post = function (req, res, next) {
    let collection = db.getCollection(AS_COLLECTION_NAME);

    let columns = req.body.columns || {};
    let filter = req.body.filter;
    let limit = parseInt(req.body.limit) || 40;
    let pageNumber = parseInt(req.body.pageNumber) || 0;
    let sort = req.body.sort || {};
    let domainName = req.webitelUser.attr.domain;

    let query = buildFilterQuery(filter);

    if (domainName && typeof domainName == "string")
        query['$and'].push({
            "domain": domainName
        });

    collection
        .find(query, columns)
        .sort(sort)
        .skip(pageNumber > 0 ? ((pageNumber - 1) * limit) : 0)
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

function buildFilterQuery(filter) {
    var filterArray = [];
    if (filter) {
        for (var key in filter) {
            if (key == '_id' && ObjectId.isValid(filter[key])) {
                filter[key] = ObjectId(filter[key]);
                continue;
            }
            for (var item in filter[key]) {
                if (filter[key][item] == '_id' && ObjectId.isValid(filter[key])) {
                    filter[key][item] = ObjectId(filter[key]);
                }
            }
        }
        filterArray.push(filter)
    };

    var query = {
        "$and": filterArray
    };
    return query
};