import gulp from 'gulp'

import { paths } from '#config/paths.js'
import { withPlumber } from '#gulp/utils/errors.js'
import { getGlobals } from '#gulp/utils/data.js'
import { createUrlHelpers } from '#gulp/utils/urls.js'

import { posthtmlPipe } from '#gulp/pipelines/templates/html/plugins.js'
import { getPosthtmlPlugins } from '#gulp/pipelines/templates/html/posthtml.js'
import { htmlMinifyPipe } from '#gulp/pipelines/templates/html/minify.js'

export const templatesSrc = (srcGlob, taskName) => gulp.src(srcGlob).pipe(withPlumber(taskName))

export const templatesDest = async (
  stream,
  { enableExpressions = false, locals = {}, dest } = {},
) => {
  const mergedLocals = { ...(await getGlobals()), url: createUrlHelpers(), ...locals }
  const outDir = dest || paths.out

  const piped = stream
    .pipe(
      posthtmlPipe(
        getPosthtmlPlugins({
          locals: mergedLocals,
          enableExpressions,
        }),
      ),
    )
    .pipe(htmlMinifyPipe())
    .pipe(gulp.dest(outDir))

  return piped
}
