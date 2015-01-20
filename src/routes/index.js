var log = require('../lib/log')(module),
    conf = require('../conf'),
    auth = require('./V2/auth');

module.exports = function (app) {
    app.all('/*', function(req, res, next) {
        // CORS headers
        res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        // Set custom headers for CORS
        res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
        if (req.method == 'OPTIONS') {
            res.status(200).end();
        } else {
            next();
        }
    });

    // REST V1
    app.all('/api/v1/*', require('./V1/baseAuth'));
    /* DOMAIN */
    app.post('/api/v1/domains?', require('./V1/domain').Create);
    app.delete('/api/v1/domains?/:name', require('./V1/domain').Delete);
    /* ACCOUNT */
    app.post('/api/v1/accounts?', require('./V1/account').Create);
    /* CONFIGURE */
    app.get('/api/v1/reloadxml', require('./V1/configure').ReloadXml);


    // REST V2
    app.all('/api/v2/*', [require('../middleware/validateRequest')]);
    app.post('/login', auth.login);

    app.get('/api/v2/status', require('./V2/status'));

    /* DOMAIN */
    app.post('/api/v2/domain', require('./V2/domain').Create);
    app.delete('/api/v2/domain/:name', require('./V2/domain').Delete);

    /* ACCOUNT */
    app.post('/api/v2/account', require('./V2/account').Create);

    /* CONFIGURE */
    app.get('/api/v2/reloadxml', require('./V2/configure').ReloadXml);
};