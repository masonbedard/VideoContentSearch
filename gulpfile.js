var gulp = require("gulp");
var source  = require("vinyl-source-stream");
var browserify = require("browserify");
var hbsfy = require("hbsfy");

var browserifyMetadata = "./src/js/app.js";
var dstFile = "app.js";
var dstDir = "./public/";

var rebundle = function(bundler) {
    return bundler.bundle()
           .pipe(source(dstFile))
           .pipe(gulp.dest(dstDir));
};

gulp.task("default", ["browserify"]);

gulp.task("browserify", function() {
    var bundler = browserify(browserifyMetadata);
    bundler = bundler.transform(hbsfy);
    return rebundle(bundler);
});
