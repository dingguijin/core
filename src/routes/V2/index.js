/**
 * Created by i.navrotskyj on 09.02.2015.
 */
var auth = require('./auth'),
    calls = require('./calls'),
    dialplan = require('../../mod/dialplan'),
    calendar = require('../../mod/calendar'),
    callcenter = require('./callcenter')
    ;

module.exports = function (app) {
    // REST V2
    app.all('/api/v2/*', [require('../../middleware/validateRequest')]);
    app.post('/login', auth.login);
    app.post('/logout', auth.logout);

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
    app.post('/api/v2/fake', calls.FakeCall);
    app.delete('/api/v2/channels/:id', calls.KillUuid);
    app.put('/api/v2/channels/:id', calls.ChangeState);

    /* DIALPLAN */
    app.post('/api/v2/routes/public', dialplan.CreatePublic);
    app.get('/api/v2/routes/public', dialplan.GetPublicDialplan);
    app.delete('/api/v2/routes/public/:id', dialplan.DeletePublicDialplan);
    app.put('/api/v2/routes/public/:id', dialplan.UpdatePublicDialplan);

    app.post('/api/v2/routes/default', dialplan.CreateDefault);
    app.get('/api/v2/routes/default', dialplan.GetDefaultDialplan);
    app.delete('/api/v2/routes/default/:id', dialplan.DeleteDefaultDialplan);
    app.put('/api/v2/routes/default/:id', dialplan.UpdateDefaultDialplan);
    app.put('/api/v2/routes/default/:id/setOrder', dialplan.setOrderDefault);
    app.put('/api/v2/routes/default/:domainName/incOrder', dialplan.incOrderDefault);

    app.post('/api/v2/calendar', calendar.post);

    app.all('/api/v2/cdr|files|media*', require('./cdr'));

    app.get('/api/v2/callcenter/queues', callcenter.List);
    app.post('/api/v2/callcenter/queues', callcenter.Create);
    app.get('/api/v2/callcenter/queues/:name', callcenter.Item);
    app.put('/api/v2/callcenter/queues/:name', callcenter.Update);
    app.put('/api/v2/callcenter/queues/:name/:state', callcenter.SetState);
    app.delete('/api/v2/callcenter/queues/:name', callcenter.Delete);

    app.post('/api/v2/callcenter/queues/:queue/tiers', callcenter.PostTier);
    app.put('/api/v2/callcenter/queues/:queue/tiers/:agent/level', callcenter.PutLevel);
    app.put('/api/v2/callcenter/queues/:queue/tiers/:agent/position', callcenter.PutPosition);
    app.delete('/api/v2/callcenter/queues/:queue/tiers/:agent', callcenter.DeleteTier);
};