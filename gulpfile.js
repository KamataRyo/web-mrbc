(function() {
  var coffee, gulp, plumber;

  gulp = require('gulp');

  coffee = require('gulp-coffee');

  plumber = require('gulp-plumber');

  gulp.task('coffee', function() {
    return gulp.src('./*.coffee').pipe(plumber()).pipe(coffee()).pipe(gulp.dest('./'));
  });

  gulp.task('build', ['coffee']);

  gulp.task('watch', ['build'], function() {
    return gulp.watch(['./*'], ['build']);
  });

}).call(this);
