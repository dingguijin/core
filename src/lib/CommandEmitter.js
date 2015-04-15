/**
 * Created by i.n. on 10.04.2015.
 */

var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    log = require('./log')(module);

var CommandEmitter = function () {
    EventEmitter2.call(this, {
        wildcard: true,
        delimiter: '::',
        maxListeners: 25
    });

    this.on('error', function (err) {
        if (typeof err == 'object')
            log.error(err['message'])
    });
};
util.inherits(CommandEmitter, EventEmitter2);

module.exports = CommandEmitter;