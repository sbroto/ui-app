"use strict";

// -------------------------------------
//   Task: Serve
// -------------------------------------
const nodemon = require("gulp-nodemon");
const util = require("gulp-util");

module.exports = function () {
    return function () {
        const nodeEnv = {};
        let localConfig = "development";

        if (util.env.dev || util.env.development) {
            localConfig = "development";
        } else if (util.env.int || util.env.integration) {
            localConfig = "integration";
        } else if (util.env.prod || util.env.production) {
            localConfig = "production";
        } else {
            localConfig = "development";
            console.log("No local environment option, defaulting to " + localConfig);
        }

        nodeEnv.node_env = localConfig; // eslint-disable-line camelcase

        if (util.env.mock) {
            console.log("Mock data enabled");
            nodeEnv.mockData = true;
        }

        nodemon({
            script: "server/app.js",
            env: nodeEnv,
            watch: ["server/"],
            ignore: ["server/mock-data"],
            ext: "js json"
        })
            .on("restart", function () {
                console.log("app.js restarted");
            });
    };
};
