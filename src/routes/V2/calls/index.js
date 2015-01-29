var url = require("url");

var Calls = {
    getChannels: function (req, res, next) {
        try {
            var _item = '',
                parts = url.parse(req.url, true, true),
                query = parts.query,
                _domain = query.domain;
            if (req.webitelDomain) {
                _domain = req.webitelDomain
            };
            if (_domain) {
                _item = ' like %@' + _domain;
            };
            eslConn.show('channels' + _item, 'json', function (err, parsed) {
                if (err)
                    return res.status(500).json(err.message);
                res.status(200).json(parsed);
            });
        } catch (e) {
            next(e);
        }
    }
};

module.exports = Calls;