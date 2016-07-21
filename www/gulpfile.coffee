gulp    = require 'gulp'
coffee  = require 'gulp-coffee'
sass    = require 'gulp-sass'
plumber = require 'gulp-plumber'

gulp.task 'coffee', ->
    gulp.src 'assets/*.coffee'
        .pipe plumber()
        .pipe coffee()
        .pipe gulp.dest 'assets/'

gulp.task 'sass', ->
    gulp.src 'assets/*.scss'
    .pipe plumber()
    .pipe sass()
    .pipe gulp.dest 'assets/'

gulp.task 'build', ['coffee', 'sass']

gulp.task 'watch', ['build'], ->
    gulp.watch ['assets/*'], ['build']
