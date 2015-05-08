/**
 * Created by i.n on 04.05.2015.
 */
var serveStatic = require('serve-static');

module.exports = function (app) {
    app.use('/api/docs', serveStatic( __dirname + '/static'));
};