import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'
import { getGlobals } from '#gulp/utils/data.js'
import { lazyDefault } from '#gulp/utils/lazy.js'

import { templatesSrc, templatesDest } from '#gulp/pipelines/templates/common.js'

export const templatesPug = async (options = {}) => {
  const locals = { ...(await getGlobals()), ...(options.locals || {}) }
  const pug = await lazyDefault('gulp-pug-3')
  if (!pug) {
    throw new Error(
      '[templates:pug] Missing dependency: "gulp-pug-3". Install: pnpm i -D gulp-pug-3 pug (or npm i -D gulp-pug-3 pug).',
    )
  }
  const stream = templatesSrc(paths.pages.pug, 'templates:pug').pipe(
    pug({
      ...templates.pug,
      locals,
    }),
  )

  return templatesDest(stream, options)
}
