import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'
import { getGlobals } from '#gulp/utils/data.js'
import { lazyDefault } from '#gulp/utils/lazy.js'

import { templatesSrc, templatesDest } from '#gulp/pipelines/templates/common.js'

export const templatesNunjucks = async (options = {}) => {
  const data = { ...(await getGlobals()), ...(options.locals || {}) }
  const nunjucksRender = await lazyDefault('gulp-nunjucks-render')
  if (!nunjucksRender) {
    throw new Error(
      '[templates:nunjucks] Missing dependency: "gulp-nunjucks-render". Install: pnpm i -D gulp-nunjucks-render nunjucks (or npm i -D gulp-nunjucks-render nunjucks).',
    )
  }
  const stream = templatesSrc(paths.pages.nunjucks, 'templates:nunjucks').pipe(
    nunjucksRender({
      path: templates.nunjucks.paths,
      envOptions: templates.nunjucks.envOptions,
      data,
    }),
  )

  return templatesDest(stream, options)
}
