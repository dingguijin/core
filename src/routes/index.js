var log = require('../lib/log')(module),
    conf = require('../conf'),
    auth = require('./auth');

module.exports = function (app) {
    app.post('/login', auth.login);

    app.get('/api/v1/status', require('./status'));

    /* DOMAIN */
    app.post('/api/v1/domain', require('./domain').Create);
    app.post('/api/v1/domains', require('./domain').Create);
    app.delete('/api/v1/domain/:name', require('./domain').Delete);
    app.delete('/api/v1/domains/:name', require('./domain').Delete);

    /* ACCOUNT */
    app.post('/api/v1/account', require('./account').Create);
    app.post('/api/v1/accounts', require('./account').Create);

    /* CONFIGURE */
    app.get('/api/v1/reloadxml', require('./configure').ReloadXml);
};