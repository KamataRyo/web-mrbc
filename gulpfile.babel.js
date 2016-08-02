import gulp       from 'gulp'
import sourcemaps from 'gulp-sourcemaps'
import babel      from 'gulp-babel'
import plumber    from 'gulp-plumber'

gulp.task('babel', () => {
    gulp.src('src/**/*.js')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'))
})

gulp.task('build', ['babel'])

gulp.task('watch', ['build'], () => {
    gulp.watch(['src/*', 'spec/*'], ['build'])
})
