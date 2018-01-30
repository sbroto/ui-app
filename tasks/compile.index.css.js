"use strict";

// -------------------------------------
//   Task: Compile: Inline Index Source
// -------------------------------------
const autoprefixer = require("gulp-autoprefixer");
const importOnce = require("node-sass-import-once");
const cleanCSS = require("gulp-clean-css");
const sass = require("gulp-sass");

module.exports = function (gulp) {
    return function () {
        return gulp.src("./public/index-inline.scss")
            .pipe(sass({
                includePaths: "./public/bower_components/",
                importer: importOnce,
                importOnce: {
                    index: true,
                    bower: true
                }
            })
                .on("error", sass.logError))
            .pipe(autoprefixer())
            .pipe(cleanCSS())
            .pipe(gulp.dest("./public"));
    };
};
