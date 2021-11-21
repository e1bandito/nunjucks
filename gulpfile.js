const gulp = require('gulp');
const plumber = require('gulp-plumber');
const data = require('gulp-data');
const merge = require('gulp-merge-json');
const nunjucksRender = require('gulp-nunjucks-render');
const fs = require('fs');
const server = require('browser-sync').create();
const del = require('del');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const pcmq = require('postcss-sort-media-queries');
const minify = require('postcss-minify');
const sprite = require('gulp-svgstore');

// svg sprite

gulp.task('sprite', (done) => {
  gulp
    .src('src/assets/svg-sprite/*.svg')
    .pipe(plumber())
    .pipe(sprite())
    .pipe(gulp.dest('build/assets'))
  done();
});

// styles

gulp.task('styles', (done) => {
  gulp
    .src('src/styles/styles.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([autoprefixer(), pcmq(), minify()]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/css'))
    .pipe(server.stream());
  done()
});

// template nunjucks
gulp.task('template', (done) => {
  gulp
    .src('src/templates/pages/*.+(html|nunjucks|njk)')
    .pipe(plumber())
    .pipe(data(function() {
      return JSON.parse(fs.readFileSync('./src/data/data.json'))
  }))
    .pipe(nunjucksRender({
      path: ['src/blocks/', 'src/templates/']
    }))
    .pipe(gulp.dest('build'))
    .pipe(server.stream());
  done();
});

// merge all data in blocks
gulp.task('merge', () => {
  return gulp
    .src('src/blocks/**/*.json')
    .pipe(plumber())
    .pipe(merge({
      fileName: 'data.json'
    }))
    .pipe(gulp.dest('src/data'));
});

// clean build
gulp.task('clean', () => {
  return del('build');
})

// server
gulp.task('serve', () => {
  server.init({
    server: 'build/',
    notify: false,
    open: true,
    cors: true,
    ui: false,
  });
  gulp.watch('src/blocks/**/*.+(html|nunjucks|njk)', gulp.series('merge', 'template'));
  gulp.watch('src/templates/**/*.+(html|nunjucks|njk)', gulp.series('merge', 'template'));
  gulp.watch('src/blocks/**/*.json', gulp.series('merge', 'template'));
  gulp.watch('src/blocks/**/*.+(scss|sass|css)', gulp.series('styles'));
  gulp.watch('src/styles/**/*.+(scss|sass|css)', gulp.series('styles'));
});

// build
gulp.task('build', gulp.series('clean', 'merge', gulp.parallel('template', 'styles')));