/**
 * Created by i.navrotskyj on 09.04.2015.
 */

/**
 * Internal extension route;
 */

var db = require('../../lib/mongoDrv'),
    log = require('../../lib/log')(module)
    conf = require('../../conf'),
    EXTENSION_COLLECTION_NAME = conf.get('mongodb:collectionExtension')
    ;


var Controller = {
    deleteUser: function (userId, cb) {
    },

    updateUser: function (userId, params, cb) {
    },

    deleteUsersFromDomain: function (domainName, cb) {
    },

    addUser: function (userId, params, cb) {
    },

    /**
     * импорт пользователей в базу
     */
    syncData: function () {
    }
};

module.exports = Controller;