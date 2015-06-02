/**
 * Created by i.n on 04.05.2015.
 */
var serveStatic = require('serve-static');
var path = require('path');

module.exports = function (app) {
    app.use('/dashboard/', serveStatic(path.join(__dirname, '/static')));
};