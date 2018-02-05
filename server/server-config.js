/*
 * This module reads config settings from local-config.json when running locally,
 * or from the VCAPS environment variables when running in Cloud Foundry.
 */

"use strict";

const cfenv = require("cfenv");
const url = require("url");

let serverConfig = null;

const getCredentials = {
    "predix-uaa": function (config, credentials) {
        config.uaa = {
            uri: credentials.uri,
            userClientId: process.env.userClientId,
            userClientSecret: process.env.userClientSecret,
            appClientId: process.env.appClientId,
            appClientSecret: process.env.appClientSecret,
            tokensProp: "tokens",
            callbackProp: "callback",
            // The refreshWindow is in seconds
            refreshWindow: 10, // eslint-disable-line no-magic-numbers
            loginURL: "/login",
            callbackURL: "/callback"
        };
    },
    "predix-acs": function (config, credentials) {
        config.acs = {
            endpoint: credentials.uri,
            zoneHeaderName: credentials.zone["http-header-name"],
            zoneHeaderValue: credentials.zone["http-header-value"]
        };
    },
    "predix-timeseries": function (config, credentials) {
        // The uri exposed in VCAP for timeseries contains the path to query datapoints
        const uri = url.parse(credentials.query.uri);

        config.proxy["predix-timeseries"] = {
            endpoint: uri.protocol + "//" + uri.host,
            headers: [
                [credentials.query["zone-http-header-name"], credentials.query["zone-http-header-value"]]
            ]
        };
    },

    "predix-cache": function (config, credentials) {
        config.redis = {
            host: credentials.host,
            port: credentials.port,
            password: credentials.password
        };
    },
    "predix-asset": function (config, credentials) {
        config.proxy["predix-asset"] = {
            endpoint: credentials.uri,
            headers: [
                [credentials.zone["http-header-name"], credentials.zone["http-header-value"]]
            ]
        };
    },
    "predix-blobstore": function (config, credentials) {
        config.blobstore = {
            host: credentials.host,
            bucketName: credentials.bucket_name,
            accessKeyId: credentials.access_key_id,
            accessKeySecret: credentials.secret_access_key
        };
    },
    "cim-service": function (config, credentials) {
        config.proxy["cim-service"] = {
            endpoint: credentials.uri
        };
    },
	"cim-cups-service": function (config, credentials) {
		config.proxy["cim-cups-service"] = {
			endpoint: credentials.uri
		};
	}
};

function exportLocalConfig(nodeEnv) {
    let vcap = {};

    function exportIfDefined(key, value) {
        if (value) {
            process.env[key] = value;
        }
    }

    if (!process.env.VCAP_APPLICATION) {
        const localConfig = require("./local-config.json")[nodeEnv]; // eslint-disable-line global-require

        Object.keys(localConfig.env)
            .forEach(key => exportIfDefined(key, localConfig.env[key]));

        vcap = localConfig.vcap;
    }
    return vcap;
}

function setServerConfig() {
    const nodeEnv = process.env.node_env || "development";

    // Export environment variable if local env
    const vcap = exportLocalConfig(nodeEnv);

    serverConfig = {
        nodeEnv: nodeEnv,
        proxy: {}
    };

    // The getAppEnv method will only use the vcap parameter if running locally
    const env = cfenv.getAppEnv({vcap: vcap});

    // Application configuration
    serverConfig.port = env.port;

    // Services configuration
    const services = env.getServices();

    Object.keys(services).forEach(function (serviceName) {
        const service = services[serviceName];
        const getCurrentServiceCredentials = getCredentials[service.name] || getCredentials[service.label];

        if (getCurrentServiceCredentials) {
            getCurrentServiceCredentials(serverConfig, service.credentials);
        } else {
            console.log("There is no defined way to get credentials for service " + service.name);
        }
    });

    // Detect environment
    serverConfig.uaaIsConfigured = Boolean(serverConfig.uaa &&
        serverConfig.uaa.uri &&
        serverConfig.uaa.uri.indexOf("https") === 0 &&
        serverConfig.uaa.userClientId &&
        serverConfig.uaa.userClientSecret
    );

    serverConfig.acsIsConfigured = Boolean(serverConfig.acs &&
        serverConfig.acs.endpoint &&
        serverConfig.acs.endpoint.indexOf("https") === 0 &&
        serverConfig.acs.zoneHeaderValue);


    console.log("************" + nodeEnv + "******************");
    console.log("SERVER CONFIG:");
    console.log(JSON.stringify(serverConfig, null, "\t"));

    return serverConfig;
}

function getServerConfig() {
    if (serverConfig) {
        return serverConfig;
    }
    return setServerConfig();
}

function resetServerConfig() {
    serverConfig = null;
}

module.exports = {
    getServerConfig: getServerConfig,
    resetServerConfig: resetServerConfig
};
