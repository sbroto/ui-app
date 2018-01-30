"use strict";

const request = require("request");
const proxy = require("./proxy");
const serverConfig = require("./server-config");
const config = serverConfig.getServerConfig();

const HTTP_FORBIDDEN_STATUS = 403;
const ACS_PERMIT = "PERMIT";

function isAuthorized(req, res, next) {
    const requestBody = {
        action: req.method,
        resourceIdentifier: req.path,
        subjectIdentifier: req.user.user_name
    };

    proxy.checkClientToken(req.session)
        .then(function () {
            const requestOptions = {
                url: config.acs.endpoint + "/v1/policy-evaluation",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: req.session.authorizationHeader
                },
                json: true,
                body: requestBody
            };

            requestOptions.headers[config.acs.zoneHeaderName] = config.acs.zoneHeaderValue;

            request.post(requestOptions, function (err, resp, data) {
                if (data && data.effect === ACS_PERMIT) {
                    next();
                } else {
                    res.sendStatus(HTTP_FORBIDDEN_STATUS);
                }
            });

        })
        .catch(function (err) {
            res.send(err);
        });

}


module.exports = {
    isAuthorized: isAuthorized
};
