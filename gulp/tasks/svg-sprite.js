import fs from 'node:fs'
import path from 'node:path'

import gulp from 'gulp'
import svgSprite from 'gulp-svg-sprite'

import { paths } from '#config/paths.js'
import { plugins } from '#config/plugins.js'
import { svg } from '#config/svg.js'
import { features } from '#config/features.js'
import { withPlumber } from '#gulp/utils/errors.js'
import { env } from '#gulp/utils/env.js'
import { notifyError } from '#gulp/utils/notify.js'
import { toPosix } from '#gulp/utils/glob.js'
import { logger } from '#gulp/utils/logger.js'

function makeIdFromFilePath(filePathAbs) {
  const root = paths.assets.iconsBase
  const rel = toPosix(path.relative(root, filePathAbs))

  return rel
    .replace(/\.svg$/i, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function makeConfig() {
  const spriteName = svg.sprite?.filename ?? 'sprite.svg'

  const doOptimize = env.isProd
    ? Boolean(svg.sprite?.optimize?.prod)
    : Boolean(svg.sprite?.optimize?.dev)

  const toSvgo2Config = cfg => {
    const input = cfg && typeof cfg === 'object' ? cfg : {}
    const out = {
      multipass: Boolean(input.multipass),
      plugins: [],
    }

    const pluginsIn = Array.isArray(input.plugins) ? input.plugins : []

    const isV4Style = pluginsIn.some(p => p && typeof p === 'object' && 'name' in p)

    if (isV4Style) {
      for (const p of pluginsIn) {
        if (!p || typeof p !== 'object') continue
        const name = p.name
        if (!name) continue

        if (name === 'preset-default') continue

        const normalizedName = name === 'cleanupIds' ? 'cleanupIDs' : name

        const active = 'active' in p ? Boolean(p.active) : true
        const params = 'params' in p ? p.params : undefined

        const pluginCfg = { name: normalizedName }
        if (active === false) pluginCfg.active = false
        if (params && typeof params === 'object') pluginCfg.params = params

        out.plugins.push(pluginCfg)
      }

      out.plugins = out.plugins.filter(x => x && typeof x.name === 'string' && x.name.length > 0)

      const hasRemoveViewBox = out.plugins.some(x => x && x.name === 'removeViewBox')
      if (!hasRemoveViewBox)
        out.plugins.push({
          name: 'removeViewBox',
          active: false,
        })

      return out
    }

    out.plugins = pluginsIn
      .map(p => {
        if (!p) return null
        if (typeof p === 'string') return { name: p }
        if (typeof p !== 'object') return null
        if ('name' in p) return p

        const keys = Object.keys(p)
        if (keys.length !== 1) return null
        const k = keys[0]
        const v = p[k]
        if (typeof v === 'boolean')
          return v === false
            ? {
                name: k,
                active: false,
              }
            : { name: k }
        return { name: k, params: v }
      })
      .filter(Boolean)

    out.plugins = out.plugins.filter(x => x && typeof x.name === 'string' && x.name.length > 0)

    const hasRemoveViewBox2 = out.plugins.some(x => x && x.name === 'removeViewBox')
    if (!hasRemoveViewBox2)
      out.plugins.push({
        name: 'removeViewBox',
        active: false,
      })

    return out
  }

  return {
    mode: {
      symbol: {
        dest: '.',
        sprite: spriteName,
        example: false,
      },
    },

    shape: {
      id: {
        generator: (_name, file) => {
          const id = makeIdFromFilePath(file.path)

          const prefix = svg.sprite?.symbolIdPrefix ?? 'icon-'
          return `${prefix}${id}`
        },
      },

      transform: doOptimize
        ? [
            {
              svgo: toSvgo2Config(
                svg.sprite?.optimize?.svgoConfig ?? {
                  multipass: true,
                  plugins: [{ removeViewBox: false }, { cleanupIDs: false }],
                },
              ),
            },
          ]
        : [],
    },

    svg: {
      xmlDeclaration: false,
      doctypeDeclaration: false,
    },
  }
}

export const svgSpriteTask = () => {
  try {
    const enabled = Boolean(features?.svgSprite?.enabled) && (svg?.sprite?.enabled ?? true)
    if (!enabled) return Promise.resolve()

    if (!fs.existsSync(paths.assets.iconsBase)) return Promise.resolve()

    const outDir = path.join(paths.out, svg.sprite?.outSubdir ?? 'images')

    return gulp
      .src(paths.assets.icons, { allowEmpty: true })
      .pipe(withPlumber('svg-sprite'))
      .pipe(svgSprite(makeConfig()))
      .pipe(gulp.dest(outDir))
      .pipe(plugins.browserSync.stream())
  } catch (err) {
    notifyError({ title: 'svg-sprite', message: err?.message || String(err) })
    logger.error('svg-sprite', err?.stack || err?.message || String(err))
    if (env.isProd) throw err
    return Promise.resolve()
  }
}
