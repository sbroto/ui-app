"use strict";

// -------------------------------------
//   Task: Watch: Public
// -------------------------------------

const livereload = require("gulp-livereload");
const gulpSequence = require("gulp-sequence");

function handleError(err) {
    // Eslint errors are already notified by gulp-eslint
    // Notify other errors
    if (err && err.plugin !== "gulp-eslint") {
        console.log(err);
    }
}

module.exports = function (gulp) {
    return function () {
        const watchInterval = 750;

        livereload.listen();
        gulp.watch("./public/**/*.scss",
            {interval: watchInterval},
            function () {
                gulpSequence("compile:sass", "livereload")(handleError);
            }
        );
        gulp.watch(["./public/_index.html", "./public/_index-inline-loading-script.js", "./public/index-inline.scss"],
            {interval: watchInterval},
            function () {
                gulpSequence("compile:index", "livereload")(handleError);
            }
        );
        gulp.watch(["./public/**/*.html", "!./public/**/*-styles.html", "./server/**/*.js"],
            {interval: watchInterval}, function () {
                gulpSequence("lint", "livereload")(handleError);
            }
        );

    };
};
