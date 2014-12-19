var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    log = require('./log')(module);

var HashCollection = module.exports = function() {
    this.collection = {};

    var length = 0;
    EventEmitter2.call(this, {
        wildcard: true,
        maxListeners: 25
    });
    this.add = function(key, element) {
        if (this.collection[key]) {
            log.error('Key ' + key + ' already defined!');
            //throw new Error('Key ' + key + ' already defined!');
        } else {
            this.collection[key] = element;
            length++;
            this.emit('added', element);
        };
    };

    this.length = function() {
        return length;
    };

    this.get = function(key) {
        return this.collection[key]
    };

    this.remove = function(key) {
        if (this.collection[key]) {
            var removedElement = this.collection[key];
            delete this.collection[key];
            length--;
            this.emit('removed', removedElement);
        };
    };
};

util.inherits(HashCollection, EventEmitter2);