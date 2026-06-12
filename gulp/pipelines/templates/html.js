import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'

import { fileIncludePipe } from '#gulp/pipelines/templates/html/file-include.js'
import { templatesSrc, templatesDest } from '#gulp/pipelines/templates/common.js'

export const templatesHtml = async (options = {}) => {
  const mode = templates.html?.mode || 'both'

  let stream = templatesSrc(paths.pages.html, 'templates:html')

  if (mode === 'fileinclude' || mode === 'both') {
    stream = stream.pipe(fileIncludePipe())
  }

  const enableExpressions = mode === 'posthtml' || mode === 'both'

  return templatesDest(stream, { enableExpressions, ...options })
}