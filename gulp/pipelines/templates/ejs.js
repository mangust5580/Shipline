import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'
import { getGlobals } from '#gulp/utils/data.js'
import { lazyDefault } from '#gulp/utils/lazy.js'

import { templatesSrc, templatesDest } from '#gulp/pipelines/templates/common.js'

export const templatesEjs = async (options = {}) => {
  const data = { ...(await getGlobals()), ...(options.locals || {}) }

  const ejs = await lazyDefault('gulp-ejs')
  if (!ejs) {
    throw new Error(
      '[templates:ejs] Missing dependency: "gulp-ejs". Install: pnpm i -D gulp-ejs ejs (or npm i -D gulp-ejs ejs).',
    )
  }

  const rename = await lazyDefault('gulp-rename')
  if (!rename) {
    throw new Error(
      '[templates:ejs] Missing dependency: "gulp-rename". Install: pnpm i -D gulp-rename (or npm i -D gulp-rename).',
    )
  }

  const stream = templatesSrc(paths.pages.ejs, 'templates:ejs')
    .pipe(ejs(data, templates.ejs.options))
    .pipe(rename({ extname: '.html' }))

  return templatesDest(stream, options)
}
