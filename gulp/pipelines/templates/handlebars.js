import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'
import { getGlobals } from '#gulp/utils/data.js'
import { lazyDefault } from '#gulp/utils/lazy.js'

import { templatesSrc, templatesDest } from '#gulp/pipelines/templates/common.js'

export const templatesHandlebars = async (options = {}) => {
  const data = { ...(await getGlobals()), ...(options.locals || {}) }

  const hb = await lazyDefault('gulp-hb')
  if (!hb) {
    throw new Error(
      '[templates:handlebars] Missing dependency: "gulp-hb". Install: pnpm i -D gulp-hb handlebars (or npm i -D gulp-hb handlebars).',
    )
  }

  const rename = await lazyDefault('gulp-rename')
  if (!rename) {
    throw new Error(
      '[templates:handlebars] Missing dependency: "gulp-rename". Install: pnpm i -D gulp-rename (or npm i -D gulp-rename).',
    )
  }

  const stream = templatesSrc(paths.pages.hbs, 'templates:handlebars')
    .pipe(
      hb(templates.handlebars.options)
        .partials(templates.handlebars.partials)
        .data(data)
        .helpers(templates.handlebars.helpers || {}),
    )
    .pipe(rename({ extname: '.html' }))

  return templatesDest(stream, options)
}
