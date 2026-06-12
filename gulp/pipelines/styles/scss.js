import path from 'node:path'
import gulp from 'gulp'
import gulpSass from 'gulp-sass'
import * as dartSass from 'sass'

import { paths } from '#config/paths.js'
import { plugins } from '#config/plugins.js'
import { styles } from '#config/styles.js'
import { withPlumber } from '#gulp/utils/errors.js'
import { getPostcssPlugins } from '#gulp/utils/postcss-plugins.js'
import { env } from '#gulp/utils/env.js'

const sass = gulpSass(dartSass)

export const stylesScss = async () => {
  const postcssPlugins = await getPostcssPlugins('scss', styles)

  return gulp
    .src(paths.styles.entryScss)
    .pipe(withPlumber('styles:scss'))
    .pipe(plugins.gulpIf(styles.sourcemaps, plugins.sourcemaps.init()))
    .pipe(sass(styles.sass).on('error', sass.logError))
    .pipe(plugins.postcss(postcssPlugins))
    .pipe(plugins.gulpIf(styles.sourcemaps, plugins.sourcemaps.write('.')))
    .pipe(gulp.dest(path.join(paths.out, paths.styles.dest)))

    .pipe(plugins.gulpIf(env.isDev, plugins.browserSync.stream({ match: '**/*.css' })))
}
