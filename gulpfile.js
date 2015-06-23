/*jslint node: true */
(function () {
    'use strict';

    var gulp = require('gulp'),
        del = require('del'),
        plugins = require('gulp-load-plugins')();

    gulp.task('clean', function (cb) {
        del(['dist'], cb);
    });

    gulp.task('lint', function () {
        return gulp.src('src/**/*.js')
            .pipe(plugins.jslint());
    });

    gulp.task('default', ['clean'], function () {
        /*
         * Load in the JS file
         */
        return gulp.src('src/**/*.js')
            /*
             * Uglify (minify) it
             */
            .pipe(plugins.uglify())
            /*
             * Annotate that it was minified by adding .min to filename
             */
            .pipe(plugins.rename({
                suffix: '.min'
            }))
            /*
             * Output to our distribution location
             */
            .pipe(gulp.dest('dist'));
    });
}());