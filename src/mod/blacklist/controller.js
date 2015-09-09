/**
 * Created by i.n. on 28.07.2015.
 */

var log = require('../../lib/log')(module),
    config = require('../../conf'),
    BL_COLLECTION_NAME = config.get('mongodb:collectionBlackList'),
    ObjectId = require('mongodb').ObjectId,
    db = require('../../lib/mongoDrv');

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

var BlackList = {
    
    create: function (data, cb) {
        try {
            var collection = db.getCollection(BL_COLLECTION_NAME);

            if (!data['domain'] || !data['name'] || !data['number']) {
                return cb(new Error('Bad request: domain, name or number is required.'));
            };

            var number = data['number'];
            if (number instanceof Array) {
                var batch = collection.initializeUnorderedBulkOp();

                for (var i = 0, len = number.length; i < len; i++) {
                    batch.insert(
                        {
                            "domain": data['domain'],
                            "name": data['name'],
                            "number": number[i].toString()
                        }
                    );
                };
                batch.execute(cb);
            } else {
                collection.update({
                        "domain": data['domain'],
                        "name": data['name'],
                        "number": data['number']
                    },
                    data,
                    {upsert: true},
                    cb);
            }
            return;
        } catch (e) {
            cb(e);
        };
    },

    getNames: function (domain, cb) {
        try {
            if (!domain) {
                return cb(new Error('Bad request: domain is required.'))
            };
            var collection = db.getCollection(BL_COLLECTION_NAME);
            collection.aggregate([
                {"$match": {"domain": domain}},
                {"$project": {"name": 1}},
                {"$group": {"_id": {"name": "$name"}}},
                {"$project": {"name": "$_id.name", "_id": 0}}
            ], cb);
        } catch (e) {
            cb(e);
        };
    },
    
    search: function (domain, option, cb) {
        var filter = option['filter'];
        var columns = option['columns'] || {};
        var limit = option['limit'] || 40;
        var sort = option['sort'] || {};
        var pageNumber = option['pageNumber'];

        var query = buildFilterQuery(filter);

        if (domain) {
            query['$and'].push({
                "domain": domain
            });
        };

        var collection = db.getCollection(BL_COLLECTION_NAME);
        collection.find(query['$and'].length == 0 ? {} : query, columns)
            .sort(sort)
            .skip(pageNumber > 0 ? ((pageNumber - 1) * limit) : 0)
            .limit(limit)
            .toArray(cb);
    },

    remove: function (domain, option, cb) {
        var filter = {
            "domain": domain
        };

        if (option['name']) {
            filter['name'] = option['name'];
        };

        if (option['number']) {
            filter['number'] = option['number'];
        };

        if (Object.keys(filter).length == 1) {
            return cb(new Error('Bad request'));
        };

        var collection = db.getCollection(BL_COLLECTION_NAME);
        collection.remove(filter, cb);
    }
};

module.exports = BlackList;