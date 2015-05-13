/**
 * Created by i.n. on 05.05.2015.
 */

var path = require('path');
var nconf = require(path.join(__appRoot, 'conf'));

if (!nconf.get('callmax')) {
    nconf.file('callmax', path.join(__appRoot, 'conf', 'callmax.json'));
}

module.exports = nconf;