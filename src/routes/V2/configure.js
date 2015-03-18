module.exports.ReloadXml = function (req, res, next) {
    try {

        // TODO Спросить кто может отправлять
        if (!webitel.doSendCommand(res)) return;

        webitel.reloadXml(null, function(request) {
            res.status(200).send(request.body);
        });
    } catch (e) {
        next(e)
    };
};