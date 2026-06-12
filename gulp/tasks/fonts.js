import path from 'node:path'
import fs from 'node:fs'
import { PassThrough } from 'node:stream'

import gulp from 'gulp'
import through2 from 'through2'
import ttf2woff2 from 'ttf2woff2'

import { paths } from '#config/paths.js'
import { plugins } from '#config/plugins.js'
import { withPlumber } from '#gulp/utils/errors.js'
import { env } from '#gulp/utils/env.js'

const ttfToWoff2Only = () =>
  through2.obj(function (file, _enc, cb) {
    try {
      if (!file || file.isNull()) return cb()

      const ext = path.extname(file.path).toLowerCase()

      if (!file.isBuffer()) {
        this.push(file)
        return cb()
      }
      if (ext === '.ttf') {
        const out = file.clone({ contents: false })
        out.contents = Buffer.from(ttf2woff2(file.contents))
        out.path = file.path.replace(/\.ttf$/i, '.woff2')
        this.push(out)
        return cb()
      }
      this.push(file)
      cb()
    } catch (e) {
      cb(e)
    }
  })

export const fontsTask = () => {
  const fontsDir = path.join(paths.root, 'src', 'assets', 'fonts')
  if (!fs.existsSync(fontsDir)) {
    const s = new PassThrough({ objectMode: true })
    queueMicrotask(() => s.end())
    return s
  }

  return gulp
    .src(paths.fonts.src, { allowEmpty: true, encoding: false })
    .pipe(withPlumber('fonts'))
    .pipe(ttfToWoff2Only())
    .pipe(gulp.dest(path.join(paths.out, paths.fonts.dest)))
    .pipe(plugins.gulpIf(env.isDev, plugins.browserSync.stream()))
}