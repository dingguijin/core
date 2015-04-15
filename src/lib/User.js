/**
 * Created by i.n. on 13.04.2015.
 */

var User = function (id, ws, params) {
    this.id = id;
    this.ws = [ws];
    this.state = '';
    this.status = '';
    this.logged = params['logged'] || false;
    this.attr = params['attr'] || {};
    this.eventsGroup = ['webitel', 'esl'];
};

User.prototype.addEventGroup = function (groupName) {
    if (this.eventsGroup.indexOf(groupName) === -1)
        this.eventsGroup.push(groupName);
    return this.eventsGroup;
};

User.prototype.delEventGroup = function (groupName) {
    var _index = this.eventsGroup.indexOf(groupName);
    if (_index !== -1) {
        this.eventsGroup.splice(_index, 1);
    };
    return this.eventsGroup;
};

User.prototype.existsUserInGroup = function (groupName) {
    return this.eventsGroup.indexOf(groupName) > -1;
};

User.prototype.setState = function (newState) {
    var oldState = this.state;
    this.state = newState;
    if (oldState == newState) {
        return false;
    };
    return true;
};

User.prototype.setStatus = function (newStatus) {
    var oldStatus = this.status;
    this.status = newStatus;
    if (oldStatus == newStatus) {
        return false;
    };

    return true;
};

module.exports = User;