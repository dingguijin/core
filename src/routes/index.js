module.exports = function (app) {
    app.all('/*', function(req, res, next) {
        // CORS headers
        res.header("X-Powered-By", "Webitel");
        var origin = (req.headers.origin || "*");
        res.header("Access-Control-Allow-Origin", origin); // restrict it to the required domain
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        if (req.method == 'OPTIONS') {
            res.status(200).end();
        } else {
            next();
        }
    });

    require('./V1')(app);

    require('./V2')(app);
};