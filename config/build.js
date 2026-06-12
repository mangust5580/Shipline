import {env} from '#gulp/utils/env.js'
import {templates} from '#config/templates.js'
import {styles} from '#config/styles.js'
import {scripts} from '#config/scripts.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseBuild = {
  isProd: env.isProd,
  isDev: env.isDev,

  templates: {
    engine: templates.engine,
  },

  styles: {
    engine: styles.engine,
  },

  scripts: {
    engine: scripts.engine,
  },
}

export const build = await loadUserConfig(baseBuild, 'build')
