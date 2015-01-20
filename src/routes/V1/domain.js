module.exports.Create = function (req, res, next) {
    try {
        var domain_name = req.body.domain_name,
            customer_id = req.body.customer_id;
        if (domain_name && customer_id) {
            if (!webitel.doSendCommand(res)) return;
            webitel.domainCreate(null, domain_name, customer_id, function (request) {
                res.status(200).send(request.body);
            });
        } else {
            res.status(400).send('domain_name or customer_id undefined.');
        }
    } catch (e) {
        next(e)
    };
};

module.exports.Delete = function (req, res, next) {
    try {
        var domain_name = (req.params && req.params.name)
                ? req.params.name
                : '';
        if (domain_name != '') {
            if (!webitel.doSendCommand(res)) return;
            webitel.domainRemove(null, domain_name, function(request) {
                res.status(200).send(request.body);
            });
        } else {
            res.status(400).send('domain_name undefined.');
        }
    } catch (e) {
        next(e)
    };
};