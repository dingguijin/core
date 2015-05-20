/**
 * Created by i.n on 20.05.2015.
 */

module.exports = function (app) {
    app.use(function(req, res, next){
        res.status(404);
        res.json({
            "status": "error",
            "info": req.originalUrl + ' not found.'
        });
        return;
    });

    app.use(function(err, req, res, next){
        res.status(err.status || 500);
        res.json({
            "status": "error",
            "info": err.message
        });
        return;
    });
};