const gulp = require('gulp');
const plumber = require('gulp-plumber');
const data = require('gulp-data');
const merge = require('gulp-merge-json');
const nunjucksRender = require('gulp-nunjucks-render');
const webpack = require("webpack-stream");
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
const squoosh = require('gulp-squoosh');
const path = require('path');
const argv = require('yargs').argv;
const gulpIf = require('gulp-if');

const isProd = (argv.production) ? true : false;
const isDev = !isProd;

let webpackConf = {
  output: {
    filename: "main.min.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: "/node_modules/",
      },
    ],
  },
  mode: (argv.production) ? "production" : "development",
  devtool: 'source-map'
};

// js
gulp.task("js", () => {
  return gulp
    .src(["src/js/*.js", "!js/**/*.min.js"])
    .pipe(plumber())
    .pipe(webpack(webpackConf))
    .pipe(gulp.dest("build/js"))
    .pipe(server.stream())
});

// img
gulp.task('img', (done) => {
  gulp
    .src(['src/assets/img/**/*.{png,jpg}'])
    .pipe(
      squoosh(({ filePath }) => ({
        encodeOptions: {
          avif: {},
          webp: {},
          ...(path.extname(filePath) === ".png"
            ? { oxipng: {} }
            : { mozjpeg: {} }),
        },
      }))
    )
    .pipe(gulp.dest('src/assets/img'))
  done();
});

// svg sprite
gulp.task('sprite', (done) => {
  gulp
    .src('src/assets/svg-sprite/*.svg')
    .pipe(plumber())
    .pipe(sprite())
    .pipe(gulp.dest('src/assets/img'))
  done();
});

// copy
gulp.task("copy", () => {
  return gulp
    .src(['src/assets/fonts/**', 'src/assets/img/**'], {
      base: "src/assets",
    })
    .pipe(gulp.dest("build"));
});

// styles
gulp.task('styles', (done) => {
  gulp
    .src('src/styles/styles.scss')
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(gulpIf(isProd, postcss([pcmq(), minify()])))
    .pipe(gulpIf(isDev, sourcemaps.write()))
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
  gulp.watch('src/blocks/**/*.js', gulp.series('js'));
  gulp.watch('src/js/**/*.js', gulp.series('js'));
});

// build
gulp.task('build', gulp.series('clean', 'merge', gulp.parallel('copy', 'template', 'styles', 'js')));