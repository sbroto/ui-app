"use strict";

// -------------------------------------------
//   Task: Lint all code
// -------------------------------------------

const livereload = require("gulp-livereload");

module.exports = function (gulp) {
    return function () {
        return gulp.src([
            "public/elements/**/*.html",
            "public/index.html"
        ], {base: "./"})
            .pipe(livereload({start: true}));
    };
};
