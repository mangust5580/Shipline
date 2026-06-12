import fs from 'node:fs'
import gulp from 'gulp'

import { paths } from '#config/paths.js'
import { features } from '#config/features.js'
import { plugins } from '#config/plugins.js'
import { withPlumber } from '#gulp/utils/errors.js'
import { env } from '#gulp/utils/env.js'

export const staticTask = () => {
  if (features.static?.enabled === false) {
    return Promise.resolve()
  }

  if (!fs.existsSync(paths.assets.staticBase)) {
    return Promise.resolve()
  }

  return gulp
    .src(paths.assets.static, {
      allowEmpty: true,
      base: paths.assets.staticBase,
      encoding: false,
    })
    .pipe(withPlumber('static'))
    .pipe(gulp.dest(paths.out))
    .pipe(plugins.gulpIf(env.isDev, plugins.browserSync.stream()))
}
