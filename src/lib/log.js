var winston = require('winston');
var conf = require('../conf');

function getLogger(module) {

    var path = module.filename.split('//').slice(-2).join('//');

    return new winston.Logger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                level: conf.get('application:loglevel'),
                label: path,
                'timestamp': true
            })
        ]
    })
};

module.exports = getLogger;