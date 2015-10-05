var log = require('../lib/log')(module);

module.exports = function (app) {
    app.all('/*', function(req, res, next) {
        // CORS headers
        res.header("X-Powered-By", "Webitel");
        var origin = (req.headers.origin || "*");
        res.header("Access-Control-Allow-Origin", origin); // restrict it to the required domain
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATH,DELETE,OPTIONS');
        // Set custom headers for CORS
        res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
        if (req.method == 'OPTIONS') {
            res.status(200).end();
        } else {
            next();
        }
    });

    require('./V1')(app);

    require('./V2')(app);

    app._router.stack.forEach(function(middleware){
        if(middleware.route){ // routes registered directly on the app
            route = middleware.route;
            methods = Object.keys(route.methods);
            log.info('Add: [%s]: %s', (methods.length > 1) ? 'ALL' : methods[0].toUpperCase(), route.path);

        } else if(middleware.name === 'router'){ // router middleware
            middleware.handle.stack.forEach(function(handler){
                route = handler.route;
                methods = Object.keys(route.methods);
                log.info('Add: [%s]: %s', (methods.length > 1) ? 'ALL' : methods[0].toUpperCase(), route.path);
            });
        }
    });

    require('./error')(app);
};