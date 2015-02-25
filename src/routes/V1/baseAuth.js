var log = require('../../lib/log')(module),
    conf = require('../../conf'),
    rootName = conf.get('webitelServer:account'),
    rootPassword = conf.get('webitelServer:secret') || '';

module.exports = function (req, res, next) {
    try {
        var header = req.headers['authorization'] || '',
            token = header.split(/\s+/).pop() || '',
            auth = new Buffer(token, 'base64').toString(),
            parts = auth.split(/:/),
            username = parts[0],
            password = parts[1];

        if (rootName != username || rootPassword != password) {
            res.status(401);
            res.json({
                "status": 401,
                "message": "Invalid credentials"
            });
        } else {
            next();
        }
    } catch (err) {
        res.status(500);
        res.json({
            "status": 500,
            "message": "Oops something went wrong",
            "error": err
        });
    }
};