/**
 * This module is used to mock services data.
 */

"use strict";

const serverConfig = require("./server-config");
const config = serverConfig.getServerConfig();
const proxy = require("./proxy");
const url = require("url");

const prism = require("connect-prism");
const mockEnabled = Boolean(process.env.mockData);
const mockConfig = require("./mock-config.json");
let needToken = false;

const HTTP_SERVER_ERROR = 500;

function getMockConfig(service) {
    if (service) {

        // Do not use the "proxy" mode of connect-prism
        if (!mockEnabled || mockConfig.services[service] === "proxy") {
            return null;
        }
        return mockConfig.services[service];
    }

    return {
        enabled: mockEnabled,
        withSecurity: mockEnabled && mockConfig.withSecurity
    };
}

function setMockProxyRoute(key, serviceConfig, mode) {

    if (serviceConfig.endpoint) {

        const newServiceMock = {
            name: key,
            mode: mode,
            context: "/api/" + key,
            mocksPath: "./server/mock-data",
            mockFilenameGenerator: "humanReadable",
            https: true,
            host: url.parse(serviceConfig.endpoint).host,
            port: 443,
            hashFullRequest: true,
            rewrite: {},
            headers: {}
        };

        // Remove reverse proxy endpoint
        newServiceMock.rewrite["^/api/" + key] = "";

        // Have to force the host header to make it work with predix
        newServiceMock.headers.host = newServiceMock.host;

        // Add headers from VCAP
        if (serviceConfig.headers) {
            serviceConfig.headers.forEach(function (header) {
                newServiceMock.headers[header[0]] = header[1];
            });
        }

        // Do not use cache
        newServiceMock.headers["cache-control"] = "no-cache, no-store";

        prism.create(newServiceMock);

    } else {
        console.log("No endpoint found for service " + key);
    }
}

function configure(debug) {

    // All configured services
    Object.keys(config.proxy).forEach(function (key) {
        if (getMockConfig(key)) {
            setMockProxyRoute(key, config.proxy[key], getMockConfig(key));

            if (getMockConfig(key) !== "mock") {
                needToken = true;
            }
        }
    });

    if (debug) {
        prism.useVerboseLog();
    }
}

function mock(req, res, next) {

    if (needToken && req.session) {
        proxy.checkClientToken(req.session)
            .then(function () {
                req.headers.Authorization = req.session.authorizationHeader;
                prism.middleware(req, res, next);

            })
            .catch(function (err) {
                console.log("Not able to get uaa token to record a mock");
                res.status(HTTP_SERVER_ERROR).send(err);
            });
    } else {
        prism.middleware(req, res, next);
    }

}

module.exports = {
    configure: configure,
    mock: mock,
    getMockConfig: getMockConfig
};
