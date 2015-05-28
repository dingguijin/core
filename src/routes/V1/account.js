module.exports.Create = function (req, res, next) {
    try {
        var domain = req.body.domain,
            login = req.body.login,
            role = req.body.role,
            password = req.body.password,
            parameters = req.body.parameters,
            variables = req.body.variables
            ;

        if (domain && login && role) {
            if (!webitel.doSendCommand(res)) return;

            var _param =[];
            _param.push(login);
            if (password && password != '')
                _param.push(':' + password);
            _param.push('@' + domain);

            var q = {
                "role": role,
                "param": _param.join(''),
                "attribute": {
                    "parameters": parameters,
                    "variables": variables
                }
            };

            // TODO _caller - сделать когда будет логин работать
            var _caller = {
                attr: {
                    role: {
                        val: 2
                    }
                }
            };

            webitel.userCreate(_caller, q, function(request) {
                res.status(200).send(request.body);
            });

        } else {
            res.status(400).send('login, role or domain is undefined.');
        }
    } catch (e) {
        next(e)
    };
};

module.exports.Delete = function (req, res, next) {
    try {
        var userId = (req.params && req.params.id)
            ? req.params.id
            : '';
        if (userId != '') {
            if (!webitel.doSendCommand(res)) return;

            var _caller = {
                attr: {
                    role: {
                        val: 2
                    }
                }
            };

            webitel.userRemove(_caller, userId, function(request) {
                res.status(200).send(request.body);
            });
        } else {
            res.status(400).send('id undefined.');
        }
    } catch (e) {
        next(e)
    };
};