/**
 * Created by i.navrotskyj on 09.02.2015.
 */
var auth = require('./auth'),
    calls = require('./calls'),
    dialplan = require('../../mod/dialplan');

module.exports = function (app) {
    // REST V2
    app.all('/api/v2/*', [require('../../middleware/validateRequest')]);
    app.post('/login', auth.login);

    app.get('/api/v2/status', require('./status'));

    /* DOMAIN */
    app.post('/api/v2/domains', require('./domain').Create);
    app.get('/api/v2/domains', require('./domain').Get);
    app.delete('/api/v2/domains/:name', require('./domain').Delete);

    /* ACCOUNT */
    app.get('/api/v2/accounts?:domain', require('./account').Get);
    app.post('/api/v2/accounts', require('./account').Create);

    /* CONFIGURE */
    app.get('/api/v2/reloadxml', require('./configure').ReloadXml);

    /* CALLS */
    app.get('/api/v2/channels?:domain', calls.getChannels);
    app.post('/api/v2/channels', calls.Originate);
    app.delete('/api/v2/channels/:id', calls.KillUuid);
    app.put('/api/v2/channels/:id', calls.ChangeState);

    /* DIALPLAN */
    app.post('/api/v2/route/public', dialplan.CreatePublic);
    app.get('/api/v2/route/public', dialplan.GetPublicDialplan);
    app.delete('/api/v2/route/public', dialplan.DeletePublicDialplan);
    app.put('/api/v2/route/public', dialplan.UpdatePublicDialplan);

    app.post('/api/v2/route/default', dialplan.CreateDefault);
    app.get('/api/v2/route/default', dialplan.GetDefaultDialplan);
    app.delete('/api/v2/route/default', dialplan.DeleteDefaultDialplan);
    app.put('/api/v2/route/default', dialplan.UpdateDefaultDialplan);
};