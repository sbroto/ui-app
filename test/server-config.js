"use strict";

const chai = require("chai");
const localConfig = require("../server/local-config.json").development;
const serverConfig = require("../server/server-config");

const expect = chai.expect;

const nodeEnv = "development";
let serverConfigTest = null;

describe("Server config tests", function () {
    describe("When running on the cloud", function () {
        let vcapApplication;

        before(function () {
            vcapApplication = {
                services: {
                    "predix-timeseries": [{
                        name: "timeseries-service",
                        label: "predix-timeseries",
                        credentials: {
                            query: {
                                uri: "{Time Series URL from VCAPS}",
                                "zone-http-header-name": "wow such zone id!",
                                "zone-http-header-value": "much time series! very data!"
                            }
                        }
                    }],
                    "predix-uaa": [{
                        name: "uaa-service",
                        label: "predix-uaa",
                        credentials: {
                            uri: "wow such UAA URI!"
                        }
                    }],
                    "predix-asset": [{
                        name: "asset-service",
                        label: "predix-asset",
                        credentials: {
                            uri: "{Asset URL from VCAPS}",
                            zone: {
                                "http-header-name": "Predix-Zone-Id",
                                "http-header-value": "{The Zone ID for the Asset Service Created}"
                            }
                        }
                    }],
                    "user-provided": [{
                        name: "custom-service",
                        credentials: {
                            uri: "wow such uri!"
                        }
                    }]
                }
            };
            //	Simulate cf environment
            process.env.VCAP_APPLICATION = JSON.stringify(vcapApplication);
            process.env.VCAP_SERVICES = JSON.stringify(vcapApplication.services);
            process.env.userClientSecret = "userClientSecret";
            process.env.userClientId = "userClientId";
            process.env.appClientSecret = "appClientSecret";
            process.env.appClientId = "appClientId";
            serverConfig.resetServerConfig();
            serverConfigTest = serverConfig.getServerConfig();
        });

        it("should take the values from the environment and not from the local-config file", function () {
            //	General config
            const predixUAARemote = vcapApplication.services["predix-uaa"][0].credentials.uri;

            expect(serverConfigTest.nodeEnv).to.equal(nodeEnv);
            expect(serverConfigTest.uaa.uri.toString()).to.equal(predixUAARemote);
            expect(serverConfigTest.uaa.userClientSecret.toString()).to.equal("userClientSecret");
            expect(serverConfigTest.uaa.userClientId.toString()).to.equal("userClientId");
            expect(serverConfigTest.uaa.appClientSecret.toString()).to.equal("appClientSecret");
            expect(serverConfigTest.uaa.appClientId.toString()).to.equal("appClientId");

            //	The following test must be commented if Timeseries is not used in the app
            //	Proxy timeseries config
            const predixTimeseriesRemote = vcapApplication.services["predix-timeseries"][0].credentials.query;
            const timeseriesConf = serverConfigTest.proxy["predix-timeseries"];
            const timeseriesHeader = [
                predixTimeseriesRemote["zone-http-header-name"],
                predixTimeseriesRemote["zone-http-header-value"]
            ];

            expect(timeseriesConf.headers[0]).to.deep.equal(timeseriesHeader);

            //	The following test must be commented if there is no custom service in the app
            //	Proxy custom service config
            const customServiceLocal = vcapApplication.services["user-provided"][0].credentials.uri;
            const customServiceConf = serverConfigTest.proxy["custom-service"];

            expect(customServiceConf.endpoint).to.deep.equal(customServiceLocal);
        });
    });

    describe("When running locally", function () {

        before(function () {
            delete process.env.VCAP_APPLICATION;
            serverConfig.resetServerConfig();
            serverConfigTest = serverConfig.getServerConfig();
        });

        it("should take the values from the local-config file and not from the environment", function () {
            //	General config
            const predixUAALocal = localConfig.vcap.services["predix-uaa"][0].credentials.uri;

            expect(serverConfigTest.nodeEnv).to.equal(nodeEnv);
            expect(serverConfigTest.port).to.equal(localConfig.env.PORT);
            expect(serverConfigTest.uaa.uri).to.equal(predixUAALocal);
            expect(serverConfigTest.uaa.userClientSecret).to.equal(localConfig.env.userClientSecret);
            expect(serverConfigTest.uaa.userClientId).to.equal(localConfig.env.userClientId);
            expect(serverConfigTest.uaa.appClientSecret).to.equal(localConfig.env.appClientSecret);
            expect(serverConfigTest.uaa.appClientId).to.equal(localConfig.env.appClientId);

            //	Proxy timeseries config
            const predixTimeseriesLocal = localConfig.vcap.services["predix-timeseries"][0].credentials.query;
            const timeseriesConf = serverConfigTest.proxy["predix-timeseries"];
            const timeseriesHeader = [
                predixTimeseriesLocal["zone-http-header-name"],
                predixTimeseriesLocal["zone-http-header-value"]
            ];

            expect(timeseriesConf.headers[0]).to.deep.equal(timeseriesHeader);

            //	Proxy custom service config
            const customServiceLocal = localConfig.vcap.services["user-provided"][0].credentials.uri;
            const customServiceConf = serverConfigTest.proxy["custom-service"];

            expect(customServiceConf.endpoint).to.deep.equal(customServiceLocal);
        });
    });
});
