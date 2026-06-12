import { build } from '#config/build.js'

import { templatesHtml } from './html.js'
import { templatesPug } from './pug.js'
import { templatesNunjucks } from './nunjucks.js'
import { templatesEjs } from './ejs.js'
import { templatesHandlebars } from './handlebars.js'

export const templatesPipeline = async (options = {}) => {
  switch (build.templates.engine) {
    case 'pug':
      return templatesPug(options)
    case 'nunjucks':
      return templatesNunjucks(options)
    case 'ejs':
      return templatesEjs(options)
    case 'handlebars':
      return templatesHandlebars(options)
    case 'html':
    default:
      return templatesHtml(options)
  }
}
