import through2 from 'through2'
import { minify } from 'html-minifier-terser'

import { env } from '#gulp/utils/env.js'
import { templates } from '#config/templates.js'

export const htmlMinifyPipe = () =>
  through2.obj(async function (file, _enc, cb) {
    try {
      const cfg = templates.html
      const enabled = Boolean(cfg.minify) && env.isProd

      if (!enabled || file.isNull()) return cb(null, file)
      if (file.isStream()) return cb(new Error('htmlMinifyPipe: streams are not supported'))

      const input = String(file.contents)
      const output = await minify(input, cfg.minifier ?? {})
      file.contents = Buffer.from(output)

      cb(null, file)
    } catch (e) {
      cb(e)
    }
  })
