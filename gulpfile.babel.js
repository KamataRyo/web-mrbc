import gulp       from 'gulp'
import sourcemaps from 'gulp-sourcemaps'
import babel      from 'gulp-babel'
import concat     from 'gulp-concat'
import plumber    from 'gulp-plumber'

gulp.task('babel-src', () => {
    gulp.src('src/**/*.js')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(concat('web-mrbc-api.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'))
})

gulp.task('babel-spec', () => {
    gulp.src('spec/**/*.es6.js')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(concat('all.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('spec'))
})


gulp.task('build', ['babel'])

gulp.task('watch', ['build'], () => {
    gulp.watch(['src/*', 'spec/*'], ['build'])
})
