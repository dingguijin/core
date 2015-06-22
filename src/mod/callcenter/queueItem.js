/**
 * Created by Admin on 22.06.2015.
 */

var log = require('../../lib/log')(module),
    HashCollection = require('../../lib/HashCollection');

module.exports = function (id, option) {
    this.id = id;

    // TODO ...
    for (var key in option) {
        if (option.hasOwnProperty(key)) {
            this[key] = option[key];
        };
    };

    this.tiers = new HashCollection('id');

    this.addTier = function (id, option) {
        this.tiers.add(id, option);
    };

    this.removeTier = function (id) {
        this.tiers.remove(id);
    };

};