
"use strict";

module.exports = {
    verbose: false,
    persistent: false,
    expanded: true,
    plugins: {
        local: {
            browsers: ["chrome"]
        },
        sauce: {
            disabled: true,
            browsers: [
                {
                    browserName: "microsoftedge",
                    platform: "Windows 10",
                    version: ""
                }, {
                    browserName: "internet explorer",
                    platform: "Windows 8.1",
                    version: "11"
                }, {
                    browserName: "safari",
                    platform: "OS X 10.11",
                    version: "9"
                }, {
                    browserName: "safari",
                    platform: "OS X 10.10",
                    version: "8"
                }
            ]
        }
    },
    suites: [
        "test/wct-example.html"
    ]
};
