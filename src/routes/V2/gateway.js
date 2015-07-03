/**
 * Created by i.n. on 02.07.2015.
 */

var log = require('../../lib/log')(module);

module.exports = {
    Create: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        /*option = {
            domain: "10.10.10.144",
            name: gateway,
            params: [{
                name: "register",
                value: true
            }, {
                name: "extension-in-contact",
                value: true
            }],
            username: login,
            password: password,
            profile: "external",
            realm: hostIP
        }*/
        webitel.createSipGateway(
            req.webitelUser,
            req['body'],
            function (result) {
                try {
                    if (result['body'] && result['body'].indexOf('-ERR') === 0) {
                        res.status(200).json({
                            "status": "error",
                            "info": result['body']
                        });
                        return;
                    };
                    res.status(200).json({
                        "status": "OK",
                        "info": result['body']
                    });
                } catch (e) {
                    log.error(e['message']);
                };
            }
        );
    },
    
    Destroy: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        webitel.removeSipGateway(
            req.webitelUser,
            req.params['name'],
            function (result) {
                try {
                    if (result['body'] && result['body'].indexOf('-ERR') === 0) {
                        res.status(200).json({
                            "status": "error",
                            "info": result['body']
                        });
                        return;
                    };
                    res.status(200).json({
                        "status": "OK",
                        "info": result['body']
                    });
                } catch (e) {
                    log.error(e['message']);
                };
            }
        )
    },
    
    Item: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;
        // TODO new commands itemSipGateway
        webitel.changeSipGateway(
            req.webitelUser,
            req.params['name'],
            'params',
            req.body,
            function (result) {

                try {
                    if (result['body'] && result['body'].indexOf('-ERR') === 0) {
                        res.status(200).json({
                            "status": "error",
                            "info": result['body']
                        });
                        return;
                    };
                    webitel._parsePlainCollectionToJSON(result['body'], function (err, resJSON) {
                        if (err) {
                            res.status(500).json({
                                "status": "error",
                                "info": err['message']
                            });
                            return;
                        }
                        ;
                        res.status(200).json({
                            "status": "OK",
                            "info": resJSON
                        });

                    });
                } catch (e) {
                    log.error(e['message']);
                };
        });
    },
    
    List: function (req, res, next) {
        if (!webitel.doSendCommandV2(res)) return;

        webitel.showSipGateway(req.webitelUser, req.query['domain'], function(result) {
            try {
                if (result['body'] && result['body'].indexOf('-ERR') === 0) {
                    res.status(200).json({
                        "status": "error",
                        "info": result['body']
                    });
                    return;
                };

                webitel._parsePlainTableToJSONArray(result['body'], function (err, resJSON) {
                    if (err) {
                        res.status(500).json({
                            "status": "error",
                            "info": err['message']
                        });
                        return;
                    }
                    ;
                    res.status(200).json({
                        "status": "OK",
                        "info": resJSON
                    });

                });
            } catch (e) {
                log.error(e);
            };
        });
    },
    
    Update: function (req, res, next) {
        
    }
}