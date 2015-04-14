/**
 * Created by i.navrotsktj on 09.04.2015.
 */

var conf = require('../../conf'),
    log = require('../../lib/log')(module),
    WEBITEL_EVENT_NAME_TYPE = require('../../consts').WEBITEL_EVENT_NAME_TYPE
    ;

log.info('Call center load.');
var CC = function (conn) {
    this.connection = conn;
    this.connection.on('esl::event::auth::success', this._onAuth.bind(this));
    this.connection.on('esl::event::CUSTOM::*', this._onEvent.bind(this));
};

CC.prototype._subscribeESL = function () {
    this.connection.filter('CC-Action', 'agent-state-change');
    this.connection.filter('CC-Action', 'agent-status-change');
};

CC.prototype._onEvent = function (e) {
    if (e.getHeader('Event-Subclass') !== 'callcenter::info')
        return;

    var jEvent = JSON.parse(e.serialize('json')),
        user = jEvent['CC-Agent'] && jEvent['CC-Agent'].split('@')
        ;
    //console.dir(jEvent);

    switch (jEvent['CC-Action']) {
        case 'agent-state-change':
            var _user = Users.get(jEvent['CC-Agent']);
            if (_user) {
                _user['state'] = jEvent['CC-Agent-State'];
            };
            break;
        case 'agent-status-change':
            var _user = Users.get(jEvent['CC-Agent']);
            if (_user) {
                _user['status'] = jEvent['CC-Agent-Status'];
            };
            break;
    };
    this.setAttributesEvent(jEvent, user);
    if (jEvent['Event-Name'])
        Domains.broadcast(jEvent['Event-Domain'], jEvent);

};

CC.prototype.setAttributesEvent = function (ccEvent, user) {
    if (ccEvent['CC-Action'] == 'agent-state-change') {
        ccEvent['Event-Name'] = WEBITEL_EVENT_NAME_TYPE.USER_STATE;
        this.setWebitelUserAttribute(ccEvent, user[1], user[0]);
    } else if (ccEvent['CC-Action'] == 'agent-status-change') {
        ccEvent['Event-Name'] = WEBITEL_EVENT_NAME_TYPE.USER_STATUS;
        this.setWebitelUserAttribute(ccEvent, user[1], user[0]);
    } else {
        ccEvent['Event-Name'] = null;
    };
};

CC.prototype.readyAgent = function (_user, opt, cb) {
    var status = opt['status']
        ? " '" + opt['status'] + "'"
        : " 'Available'";

    eslConn.bgapi('callcenter_config agent set status ' + _user['id'] + status, function (res) {
        if (getResponseOK(res)) {
            eslConn.bgapi('callcenter_config agent set state ' + _user['id'] + " 'Waiting'", function (res) {
                if (getResponseOK(res)) {
                    _user.delEventGroup('webitel');
                    _user['cc-logged'] = true;
                    _user['cc'] = {};
                };
                cb(res);
            });
        } else {
            cb(res);
        }
    });
};

CC.prototype.busyAgent = function (_user, opt, cb) {
    var state = opt['state']
        ? "'" + opt['state'] + "'"
        : "'Idle'";

    eslConn.bgapi('callcenter_config agent set state ' + _user['id'] + " " + state, cb);
};

function getResponseOK (res) {
    return res['body'] && res['body'].indexOf('+OK') == 0
};

CC.prototype.logoutUser = function (_user, cb) {
    eslConn.bgapi('callcenter_config agent set status ' + _user['id'] + " 'Logged Out'", cb);
};

CC.prototype.setWebitelUserAttribute = function (event, domainName, userId) {
    event["Event-Domain"] =  domainName;
    event["User-ID"] = userId;
    event["User-Domain"] = domainName;
    event["webitel-event-name"] = "cc";
};

CC.prototype._onAuth = function () {
    this._subscribeESL();
};


module.exports = CC;