import { STAGES } from '#gulp/constants.js'
import { logger } from '#gulp/utils/logger.js'

import { engines as rawEngines } from '#config/engines.js'
import { features as rawFeatures } from '#config/features.js'
import { paths as rawPaths } from '#config/paths.js'
import { project as rawProject } from '#config/project.js'
import { plugins as rawPlugins } from '#config/plugins.js'
import { site as rawSite } from '#config/site.js'

const isPlainObject = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

const clone = v => {
  if (Array.isArray(v)) return v.map(clone)
  if (isPlainObject(v)) {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = clone(val)
    return out
  }
  return v
}

const deepMerge = (base, extra) => {
  const out = clone(base)
  if (!isPlainObject(extra)) return out

  for (const [k, v] of Object.entries(extra)) {
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v)
    else out[k] = clone(v)
  }

  return out
}

const stagePolicy = stage => {
  const s = stage || STAGES.DEV
  if (s === STAGES.DEV) return 'warn'

  return 'fail'
}

const reportUnknownKeys = ({ scope, obj, allowed, stage }) => {
  if (!isPlainObject(obj)) return

  const unknown = Object.keys(obj).filter(k => !allowed.includes(k))
  if (!unknown.length) return

  const msg = `Unknown keys in ${scope}: ${unknown.join(', ')}`
  if (stagePolicy(stage) === 'warn') logger.warn('config', msg)
  else throw new Error(msg)
}

const req = (cond, message) => {
  if (!cond) throw new Error(message)
}

const reqString = (v, name) =>
  req(typeof v === 'string' && v.trim() !== '', `${name} must be a non-empty string`)
const reqBool = (v, name) => req(typeof v === 'boolean', `${name} must be a boolean`)
const reqNum = (v, name) =>
  req(typeof v === 'number' && Number.isFinite(v), `${name} must be a finite number`)

const DEFAULTS = Object.freeze({
  engines: {
    templates: 'html',
    styles: 'scss',
    scripts: 'esbuild',
  },

  features: {
    notifications: { enabled: false },
    i18n: { enabled: false },
    seo: {
      enabled: true,
      sitemap: true,
      robots: true,
      requireSiteUrl: { local: false, ci: true },
    },
    versioning: { enabled: true, strategy: 'hash', manifest: true },
    favicons: { enabled: false, requireSourceInBuild: true },
    svgSprite: {
      enabled: false,
      policy: { onDisabledFilesDev: 'warn', onDisabledFilesBuild: 'error' },
    },
    static: {
      enabled: false,
      policy: { onDisabledFilesDev: 'warn', onDisabledFilesBuild: 'error' },
    },
    media: {
      audio: { enabled: false, devMode: 'copy', buildMode: 'transcode' },
      video: { enabled: false, devMode: 'copy', buildMode: 'transcode' },
      policy: { onDisabledFilesDev: 'warn', onDisabledFilesBuild: 'error' },
    },
    quality: {
      lintOnDevStart: true,
      lintOnBuild: true,
      lintOnPreview: false,
      validateStructure: {
        enabled: true,
        dev: 'warn',
        build: 'fail',
        preview: 'fail',
        buildFast: 'fail',
        rules: {
          requirePages: true,
          requireScriptsEntry: true,
          requireStylesEntry: true,
          requireFaviconsSource: true,
        },
      },
      validateAssets: {
        enabled: true,
        dev: 'warn',
        build: 'fail',
        preview: 'fail',
        buildFast: 'fail',
        linksMode: 'off',
        allowNoExt: true,
        preferIndex: true,
        ignore: [],
      },
    },
    reports: {
      bundleSizes: {
        enabled: false,
        build: true,
        buildFast: false,
        preview: false,
        include: ['**/*.*'],
        exclude: ['**/*.map'],
        top: 20,
        writeJson: true,
        jsonFile: 'reports/bundle-sizes.json',
      },
    },
  },

  project: {
    server: {
      port: 3000,
      open: false,
      notify: false,
      ui: false,
      cors: true,
    },
    watch: {
      debounceMs: 150,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    },
  },

  site: {
    siteUrl: '',
    basePath: '',
    name: '',
    shortName: '',
  },
})

const validateEngines = ({ stage, engines }) => {
  req(isPlainObject(engines), 'config/engines must export an object')

  reportUnknownKeys({
    scope: 'config/engines',
    obj: engines,
    allowed: ['templates', 'styles', 'scripts'],
    stage,
  })

  const tpl = engines.templates
  const css = engines.styles
  const js = engines.scripts

  reqString(tpl, 'engines.templates')
  reqString(css, 'engines.styles')
  reqString(js, 'engines.scripts')

  req(
    ['html', 'pug', 'nunjucks', 'ejs', 'handlebars', 'hbs'].includes(tpl),
    `engines.templates must be one of: html, pug, nunjucks, ejs, handlebars (got: ${tpl})`,
  )
  req(
    ['scss', 'css', 'tailwind'].includes(css),
    `engines.styles must be one of: scss, css, tailwind (got: ${css})`,
  )
  req(['esbuild'].includes(js), `engines.scripts must be "esbuild" (got: ${js})`)
}

const validatePaths = paths => {
  req(isPlainObject(paths), 'config/paths must export an object')

  for (const k of ['root', 'src', 'dist', 'public', 'out']) {
    reqString(paths[k], `paths.${k}`)
  }

  req(isPlainObject(paths.pages), 'paths.pages must be an object')
  reqString(paths.pages.entry, 'paths.pages.entry')

  req(isPlainObject(paths.styles), 'paths.styles must be an object')
  reqString(paths.styles.dest, 'paths.styles.dest')

  req(isPlainObject(paths.scripts), 'paths.scripts must be an object')
  reqString(paths.scripts.dest, 'paths.scripts.dest')

  req(isPlainObject(paths.assets), 'paths.assets must be an object')
  reqString(paths.assets.imagesBase, 'paths.assets.imagesBase')
}

const validateProject = ({ stage, project }) => {
  req(isPlainObject(project), 'config/project must export an object')

  reportUnknownKeys({
    scope: 'config/project',
    obj: project,
    allowed: ['server', 'watch'],
    stage,
  })

  req(isPlainObject(project.server), 'project.server must be an object')
  reportUnknownKeys({
    scope: 'project.server',
    obj: project.server,
    allowed: ['port', 'open', 'notify', 'ui', 'cors'],
    stage,
  })
  reqNum(project.server.port, 'project.server.port')
  for (const k of ['open', 'notify', 'ui', 'cors'])
    reqBool(project.server[k], `project.server.${k}`)

  req(isPlainObject(project.watch), 'project.watch must be an object')
  reportUnknownKeys({
    scope: 'project.watch',
    obj: project.watch,
    allowed: ['debounceMs', 'awaitWriteFinish'],
    stage,
  })
  reqNum(project.watch.debounceMs, 'project.watch.debounceMs')
  req(
    isPlainObject(project.watch.awaitWriteFinish),
    'project.watch.awaitWriteFinish must be an object',
  )
}

const validateSite = ({ stage, site }) => {
  req(isPlainObject(site), 'config/site must export an object')

  reportUnknownKeys({
    scope: 'config/site',
    obj: site,
    allowed: ['siteUrl', 'basePath', 'name', 'shortName'],
    stage,
  })

  req(typeof site.siteUrl === 'string', 'site.siteUrl must be a string')
  req(typeof site.basePath === 'string', 'site.basePath must be a string')
  req(typeof site.name === 'string', 'site.name must be a string')
  req(typeof site.shortName === 'string', 'site.shortName must be a string')

  if (site.siteUrl) {
    const ok = /^https?:\/\//i.test(site.siteUrl)
    if (!ok) {
      const msg = `site.siteUrl should be an absolute URL starting with http(s):// (got: ${site.siteUrl})`
      if (stagePolicy(stage) === 'warn') logger.warn('config', msg)
      else throw new Error(msg)
    }
  }
}

const normalizeSite = site => {
  const out = { ...site }
  let bp = String(out.basePath || '').trim()
  if (bp === '/') bp = ''
  if (bp && !bp.startsWith('/')) bp = `/${bp}`

  bp = bp.replace(/\/+$/g, '')
  out.basePath = bp

  out.siteUrl = String(out.siteUrl || '')
    .trim()
    .replace(/\/+$/g, '')

  return out
}

const validateFeatures = ({ stage, features }) => {
  req(isPlainObject(features), 'config/features must export an object')

  reportUnknownKeys({
    scope: 'config/features',
    obj: features,
    allowed: [
      'notifications',
      'i18n',
      'seo',
      'versioning',
      'favicons',
      'svgSprite',
      'static',
      'media',
      'quality',
      'reports',
    ],
    stage,
  })

  const chkEnabled = (obj, name) => {
    if (!isPlainObject(obj)) return
    if ('enabled' in obj) reqBool(obj.enabled, `${name}.enabled`)
  }

  chkEnabled(features.notifications, 'features.notifications')
  chkEnabled(features.i18n, 'features.i18n')
  chkEnabled(features.seo, 'features.seo')
  chkEnabled(features.versioning, 'features.versioning')
  chkEnabled(features.favicons, 'features.favicons')
  chkEnabled(features.svgSprite, 'features.svgSprite')
  chkEnabled(features.static, 'features.static')

  if (isPlainObject(features.media)) {
    reportUnknownKeys({
      scope: 'features.media',
      obj: features.media,
      allowed: ['audio', 'video', 'policy'],
      stage,
    })
    chkEnabled(features.media.audio, 'features.media.audio')
    chkEnabled(features.media.video, 'features.media.video')
  }

  if (isPlainObject(features.quality)) {
    reportUnknownKeys({
      scope: 'features.quality',
      obj: features.quality,
      allowed: [
        'lintOnDevStart',
        'lintOnBuild',
        'lintOnPreview',
        'validateStructure',
        'validateStructureOnDevStart',
        'validateStructureOnBuild',
        'validateStructureOnPreview',
        'validateAssets',
        'validateOnBuild',
        'budgetOnBuild',
      ],
      stage,
    })
  }
}

const cacheByStage = new Map()

/**
 * Load, normalize and validate all config blocks.
 *
 * Validation is stage-aware:
 * - dev: warn on unknown keys / soft constraints
 * - build/preview/build:fast: throw on unknown keys / strict constraints
 */
export const getConfig = ({ stage } = {}) => {
  const stageKey = stage || 'default'
  const cached = cacheByStage.get(stageKey)
  if (cached) return cached

  const engines = deepMerge(DEFAULTS.engines, rawEngines)
  validateEngines({ stage, engines })

  const features = deepMerge(DEFAULTS.features, rawFeatures)
  validateFeatures({ stage, features })

  validatePaths(rawPaths)

  const project = deepMerge(DEFAULTS.project, rawProject)
  validateProject({ stage, project })

  const site = normalizeSite(deepMerge(DEFAULTS.site, rawSite))
  validateSite({ stage, site })

  req(isPlainObject(rawPlugins), 'config/plugins must export an object')

  const cache = Object.freeze({
    engines: Object.freeze(engines),
    features: Object.freeze(features),
    paths: Object.freeze(rawPaths),
    project: Object.freeze(project),
    site: Object.freeze(site),
    plugins: Object.freeze(rawPlugins),
  })

  cacheByStage.set(stageKey, cache)

  return cache
}
