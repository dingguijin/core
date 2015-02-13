/**
 * Created by i.navrotskyj on 12.02.2015.
 */

var MongoDb = require("mongodb"),
    db = require("../../lib/mongoDrv"),
    ObjectID = MongoDb.ObjectID,
    fs = require("fs"),
    log = require('../../lib/log')(module),
    formidable = require('formidable');

module.exports = {
    saveFile: function (req, res, next) {

        var form = new formidable.IncomingForm(),
            collection = db.getCollection('test'),
            file;
        
        form.parse(req, function(err, fields, files) {
            if (err) return next(err);
            res.json(files);
            for (var key in files) {
                file = files[key];
                var data = fs.readFileSync(file.path);
                file.data = new MongoDb.Binary(data);
                collection.save(file, {safe: true}, function (err, res) {
                    if (err) {
                        log.error(err.message);
                        return;
                    }
                    log.info(res);
                });
            };
        });

    },
    getFile: function (req, res) {
        var collection = db.getCollection('test');
        collection.findOne({}, function (err, result) {
            res.contentType(result.type);
            res.end(result.data.buffer, "binary");
        });
    }
};

