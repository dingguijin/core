/**
 * Created by i.navrotskyj on 02.04.2015.
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module),
    conf = require('../../conf'),
    CALENDAR_NAME = conf.get("mongodb:collectionCalendar");

var Calendar = {
    post: function (req, res, next) {
        var calendar = req.body || {},
            calendarCollection
            ;

        calendar['domain'] =  getDomainFromRequest(req, calendar['domain']);
        calendar['name'] = calendar['name'] || 'default';

        if (!calendar['domain'] || !calendar['startDate'] || !calendar['dueDate']) {
            res.status(400).json({
                "status": "error",
                "info": "Bad request.",
                "more info": "domain, startDate, dueDate is required"
            });
            return;
        };

        calendarCollection = db.getCollection(CALENDAR_NAME);
        calendarCollection.insert(calendar, function (err, result) {
            if (err) {
                res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
                return;
            };
            res.status(200).json({
                "status": "OK",
                "info": result[0]['_id'].toString()
            });
        });
    }
};

module.exports = Calendar;

function getDomainFromRequest (request, defVal) {
    try {
        if (request['webitelUser'] && request['webitelUser']['domain']) {
            return request['webitelUser']['domain'];
        } else {
            return defVal;
        };
    } catch (e) {
        log.error(e.message);
    };
};