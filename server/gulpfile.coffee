gulp    = require 'gulp'
coffee  = require 'gulp-coffee'
plumber = require 'gulp-plumber'

gulp.task 'coffee', ->
    gulp.src './*.coffee'
        .pipe plumber()
        .pipe coffee()
        .pipe gulp.dest './'

gulp.task 'build', ['coffee']

gulp.task 'watch', ['build'], ->
    gulp.watch ['./*'], ['build']
