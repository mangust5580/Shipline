import {env} from '#gulp/utils/env.js'
import {paths} from '#config/paths.js'
import {engines} from '#config/engines.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseTemplates = {
  engine: engines.templates,

  data: {
    globals: 'src/shared/data/global.json',
  },

  html: {
    mode: 'posthtml',
    fileInclude: {
      prefix: '@',
      basepath: 'src',
    },

    posthtml: {
      enabled: true,
      includes: true,
      includesRoot: paths.src,
      prodOnlyTransforms: env.isProd,
    },

    expressions: {
      enabled: true,
    },

    minify: env.isProd,
    minifier: {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: false,
      minifyJS: false,
    },
  },

  pug: {
    basedir: paths.src,
    pretty: env.isDev,
    doctype: 'html',
  },

  ejs: {
    options: {
      root: paths.src,
    },
  },

  nunjucks: {
    paths: [paths.src],
    envOptions: {
      noCache: env.isDev,
      watch: false,
    },
  },

  handlebars: {
    partials: ['src/shared/**/*.{hbs,html}'],
    options: {},
  },
}

export const templates = await loadUserConfig(baseTemplates, 'templates')
