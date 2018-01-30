/**
 * This module can be used to set up reverse proxying from client to Predix services or custom backend microservices.
 */

"use strict";

const url = require("url");
const express = require("express");
const moment = require("moment");
const expressProxy = require("express-http-proxy");
const HttpsProxyAgent = require("https-proxy-agent");
const request = require("request-promise");
const serverConfig = require("./server-config");
const config = serverConfig.getServerConfig();
const router = express.Router(); // eslint-disable-line new-cap

const corporateProxyServer =
    process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY;

let corporateProxyAgent;

// Constants
const HTTP_SERVER_ERROR = 500;
const HTTP_FORBIDDEN_STATUS = 403;
const HTTP_OK_STATUS = 200;

// Corporate proxy
if (corporateProxyServer) {
    corporateProxyAgent = new HttpsProxyAgent(corporateProxyServer);
}

/* ********* Define Services Routes ********* */

function cleanResponseHeaders(proxyRes, proxyResData, userReq, userRes) {
    userRes.removeHeader("Access-Control-Allow-Origin");
    return proxyResData;
}

function buildDecorator(headers) {
    return function (proxyReqOpts) {
        if (corporateProxyAgent) {
            proxyReqOpts.agent = corporateProxyAgent;
        }

        if (!proxyReqOpts.headers["content-type"] || proxyReqOpts.headers["content-type"].match(/text\/plain/i)) {
            console.log("Content-Type header not set for request to " +
                proxyReqOpts.path);
        }

        if (headers) {
            headers.forEach(function (header) {
                proxyReqOpts.headers[header[0]] = header[1];
            });
        }
        return proxyReqOpts;
    };
}

function buildPathCalculator(endpoint) {
    return function (req) {
        let proxyPath = url.parse(endpoint).path;
        let reqPath = url.parse(req.url).path;

        // Build a new path with partial path from proxy endpoint and partial path from req
        if (proxyPath.endsWith("/")) {
            proxyPath = proxyPath.substring(0, proxyPath.length - 1);
        }
        if (reqPath.startsWith("/")) {
            reqPath = reqPath.substring(1, reqPath.length);
        }
        return proxyPath + "/" + reqPath;
    };
}

function setProxyRoute(key, serviceConfig) {
    let decorator;
    let pathCalculator;

    if (serviceConfig.endpoint) {
        console.log("setting proxy route for key: " + key);
        console.log("serviceEndpoint: " + serviceConfig.endpoint);

        decorator = buildDecorator(serviceConfig.headers);
        pathCalculator = buildPathCalculator(serviceConfig.endpoint);

        router.use("/" + key, expressProxy(serviceConfig.endpoint, {
            userResDecorator: cleanResponseHeaders,
            proxyReqOptDecorator: decorator,
            proxyReqPathResolver: pathCalculator
        }));
    } else {
        console.log("No endpoint found for service " + key);
    }
}

// Create routes for each Predix service registered in config.proxy
function setProxyRoutes() {
    Object.keys(config.proxy).forEach(function (key) {
        setProxyRoute(key, config.proxy[key]);
    });
}


/* ********* Add Token Middleware ********* */

function getBasicAuth(clientId, clientSecret) {
    return "Basic " + new Buffer(clientId + ":" + clientSecret).toString("base64");
}

function getClientToken() {
    const options = {
        method: "POST",
        url: config.uaa.uri + "/oauth/token",
        form: {
            grant_type: "client_credentials", // eslint-disable-line camelcase
            client_id: config.uaa.appClientId // eslint-disable-line camelcase
        },
        headers: {
            Authorization: getBasicAuth(config.uaa.appClientId, config.uaa.appClientSecret)
        },
        resolveWithFullResponse: true
    };

    return request(options)
        .then(function (response) {
            if (response.statusCode === HTTP_OK_STATUS) {
                return JSON.parse(response.body);
            }
            throw "ERROR fetching client token: code " + response.statusCode + " - " + response.body;
        });
}


// Get client token from session or UAA and check expiration time
function checkClientToken(session) {
    if (!session.authorizationHeader ||
        moment.unix(session.clientTokenExpires).isBefore(moment().add(config.uaa.refreshWindow, "seconds"))) {
        // Debug console.log("fetching client token");
        return getClientToken()
            .then(function (token) {
                session.authorizationHeader = token.token_type + " " + token.access_token;
                // eslint-disable-next-line newline-per-chained-call
                session.clientTokenExpires = moment().add(token.expires_in, "seconds").unix();
            });
    }
    return Promise.resolve();
}

// Fetches client token, adds to request headers, and stores in session.
// Returns Forbidden if no session.
function addClientTokenMiddleware(req, res, next) {
    if (req.session) {
        if (req.session.authorizationHeader &&
            moment.unix(req.session.clientTokenExpires).isAfter(moment().add(config.uaa.refreshWindow, "seconds"))) {
            req.headers.Authorization = req.session.authorizationHeader;
            next();
        } else {
            getClientToken()
                .then(function (token) {
                    req.session.authorizationHeader = token.token_type + " " + token.access_token;
                    // eslint-disable-next-line newline-per-chained-call
                    req.session.clientTokenExpires = moment().add(token.expires_in, "seconds").unix();
                    req.headers.Authorization = req.session.authorizationHeader;
                    next();
                })
                .catch(function (errorString) {
                    res.status(HTTP_SERVER_ERROR).send(errorString);
                });
        }
    } else {
        res.status(HTTP_FORBIDDEN_STATUS).send("Forbidden");
    }
}

router.use("/", addClientTokenMiddleware);


// Create the predix service routes
setProxyRoutes();

module.exports = {
    router: router,
    addClientTokenMiddleware: addClientTokenMiddleware,
    checkClientToken: checkClientToken
};
