import { plugins } from '#config/plugins.js'
import { templates } from '#config/templates.js'

export const fileIncludePipe = () => plugins.fileInclude(templates.html.fileInclude)
