"use strict";

const path = require("path");
const express = require("express");
// Provide middleware to set various security header
const helmet = require("helmet");
// Used for session cookie
const cookieParser = require("cookie-parser");
// Simple in-memory session is used here. use connect-redis for production!!
const session = require("express-session");
// Used to send gziped files
const compression = require("compression");
// Used when requesting data from real services.
const proxy = require("./proxy");
// Used when requesting mock data.
const mockProxy = require("./mock-proxy");
// Get config serverConfig from local file or VCAPS environment variable in the cloud
const serverConfig = require("./server-config");
// Configure passport for authentication with UAA
const passportConfig = require("./passport-config");
// ACS middleware
const acs = require("./acs");
// Configure redis
const RedisStore = require("connect-redis")(session);
// Only used if you have configured properties for UAA
let passport;
let mainAuthenticate;
let mainAuthorize;

// Express server
const app = express();

// App configuration
const config = serverConfig.getServerConfig();

// Constants
const HTTP_INTERNAL_ERROR_STATUS = 500;

// Mock proxy config
const mockConfig = mockProxy.getMockConfig();
const noMockOrSecuredMock = !mockConfig.enabled || mockConfig.withSecurity;

/**********************************************************************
 SETTING UP EXPRESS SERVER
 ***********************************************************************/

app.use(helmet());
app.set("trust proxy", 1);
app.use(cookieParser("predixsample"));
app.use(compression());

const redisStore = new RedisStore({
    /*host: config.redis.host,
    port: config.redis.port,
    pass: config.redis.password,
    logErrors: function () {
        console.error("Redis connection not found.");
        throw "Redis connection not found.";
    }*/
});

app.use(session({
    store: redisStore,
    secret: "predixsample",
    name: "cookie_name",
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

if (config.uaaIsConfigured && noMockOrSecuredMock) {
    passport = passportConfig.configurePassportStrategy();
    app.use(passport.initialize());
    // Also use passport.session() middleware, to support persistent login sessions (recommended).
    app.use(passport.session());

    mainAuthenticate = options => passportConfig.authenticate(options);

} else {
    mainAuthenticate = () => ((req, res, next) => next());
}

if (config.acsIsConfigured && noMockOrSecuredMock) {
    mainAuthorize = acs.isAuthorized;
} else {
    mainAuthorize = (req, res, next) => next();
}

app.listen(config.port, () => console.log("Server is listening on: " + config.port));

/****************************************************************************
 SET UP EXPRESS ROUTES
 *****************************************************************************/

function getAppUrl(req) {
    const proto = process.env.VCAP_APPLICATION ? "https" : "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;

    return proto + "://" + host;
}

if (config.uaaIsConfigured && noMockOrSecuredMock) {
    // Login route redirect to predix uaa login page
    app.get(config.uaa.loginURL, (req, res, next) =>
        passport.authenticate("predix", {
            scope: "",
            callbackURL: getAppUrl(req) + config.uaa.callbackURL
        })(req, res, next)
    );

    // eslint-disable-next-line camelcase
    app.get("/userinfo", (req, res) => res.send({user_name: req.user.user_name}));

    // Callback route redirects to secure route after login
    app.get(config.uaa.callbackURL, (req, res, next) => {
        const successRedirect = req.session[config.uaa.callbackProp] || "/";

        req.session[config.uaa.callbackProp] = null;
        passport.authenticate("predix", {
            successRedirect: successRedirect,
            failureRedirect: config.uaa.loginURL,
            callbackURL: getAppUrl(req) + config.uaa.callbackURL
        })(req, res, next);
    });

    // Logout route
    app.get("/logout", (req, res) => {
        req.session.destroy();
        req.logout();
        res.redirect(config.uaa.uri + "/logout?redirect=" + getAppUrl(req));
    });
} else {
    // eslint-disable-next-line camelcase
    app.get("/userinfo", mainAuthenticate(), (req, res) => res.send({user_name: "User"}));

    app.get("/logout", mainAuthenticate(), (req, res) => res.redirect("/"));
}


// Mock the configured services
if (mockConfig.enabled) {
    mockProxy.configure(true);
    app.use(mockProxy.mock);
}

// Secured route to access Predix services or backend microservices
app.use("/api", mainAuthenticate({noRedirect: true}), mainAuthorize, proxy.router);


// Route for direct calls to view
app.get("/view-*", mainAuthenticate(), (req, res) => res.sendFile(process.cwd() + "/public/index.html"));


// Use this route to make the entire app secure.  This forces login for any path in the entire app.
app.use("/", mainAuthenticate(),
    express.static(path.join(__dirname, process.env["base-dir"] ? process.env["base-dir"] : "../public"))
);

/****************************************************************************
 ERROR HANDLERS
 *****************************************************************************/

// Development error handler - prints stacktrace
if (config.nodeEnv !== "cloud") {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        if (res.headersSent) {
            return next(err);
        }
        res.status(err.status || HTTP_INTERNAL_ERROR_STATUS);
        return res.send({
            message: err.message,
            error: err
        });
    });
}

// Production error handler
// No stacktraces leaked to user
app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
    if (!res.headersSent) {
        res.status(err.status || HTTP_INTERNAL_ERROR_STATUS);
        res.send({
            message: err.message,
            error: {}
        });
    }
});

module.exports = app;
