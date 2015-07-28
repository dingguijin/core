/**
 * Created by i.n. on 28.07.2015.
 */

var controller = require('./controller');

var Router = {
    /**
     * app.post('/api/v2/routes/blacklists/:name')
     */
    post: function (req, res, next) {
        var name = req.params['name'],
            data = req.body;
        data['name'] = name;
        if (req.webitelUser.attr['domain']) {
            data['domain'] = req.webitelUser.attr['domain'];
        };

        controller.create(data, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };

            res.status(200).json(result);
        });
    },
    
    getNames: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        controller.getNames(domain, function (err, result) {
            if (err) {
                res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
                return;
            }
            ;

            res.status(200).json(result);
        });
    },
    
    search: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        var data = req.body;

        controller.search(domain, data, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };

            return res.status(200).json(result)

        });
    },
    
    getFromName: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        var pageNumber = req.query['page'];
        var limit = req.query['limit'];
        var order = req.query['order'];
        var option = {
            "filter": {
                "name": req.params['name']
            }
        };

        if (order) {
            option['sort'] = {};
            option.sort[order] = req.query['orderValue'] == 1 ? 1 : -1;
        };

        option['limit'] = parseInt(limit);
        option['pageNumber'] = pageNumber;

        controller.search(domain, option, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };

            return res.status(200).json(result)

        });
    },
    
    getNumberFromName: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        var option = {
            "filter": {
                "name": req.params['name'],
                "number": req.params['number']
            }
        };
        controller.search(domain, option, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };
            return res.status(200).json({
                "status": "OK",
                "info": "Removed documents: " + result
            });
        });
    },
    
    removeNumber: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        var option = {
            "name": req.params['name'],
            "number": req.params['number']
        };
        controller.remove(domain, option, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };
            return res.status(200).json({
                "status": "OK",
                "info": "Removed documents: " + result
            });
        });
    },

    removeName: function (req, res, next) {
        var domain = req.webitelUser.attr['domain'] || req.query['domain'];
        var option = {
            "name": req.params['name']
        };
        controller.remove(domain, option, function (err, result) {
            if (err) {
                return res.status(500).json({
                    "status": "error",
                    "info": err['message']
                });
            };
            return res.status(200).json({
                "status": "OK",
                "info": "Removed documents: " + result
            });
        });
    }
};

module.exports = Router;