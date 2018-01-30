"use strict";

// -------------------------------------------
//   Task: Compile: Vulcanize ge-app element
// -------------------------------------------

const vulcanize = require("gulp-vulcanize");
const htmlMinifier = require("gulp-htmlmin");

module.exports = function (gulp) {
    return function () {
        return gulp.src([
            "public/elements/ge-app/ge-app.html"
        ], {base: "public/"})
            .pipe(vulcanize({
                abspath: "",
                excludes: [
                    "public/bower_components/polymer/polymer.html",
                    // Have to exclude the px-vis-scheduler because it has "hardcoded" path to px-vis-worker
                    "public/bower_components/px-vis/px-vis-scheduler.html"
                ],
                inlineCSS: true,
                inlineScripts: true
            }))
            .pipe(htmlMinifier({
                removeComments: true,
                minifyJS: true,
                // Side effect on px styles if collapseWhitespace
                collapseWhitespace: false
            }))
            .pipe(gulp.dest("dist/public/"));
    };
};
