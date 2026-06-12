import { STAGES } from '#gulp/constants.js'

import { templatesTask } from '#gulp/tasks/templates.js'
import { stylesTask } from '#gulp/tasks/styles.js'
import { scriptsTask } from '#gulp/tasks/scripts.js'
import { fontsTask } from '#gulp/tasks/fonts.js'
import { imagesTask } from '#gulp/tasks/images.js'
import { svgTask } from '#gulp/tasks/svg.js'
import { svgSpriteTask } from '#gulp/tasks/svg-sprite.js'
import { faviconsTask } from '#gulp/tasks/favicons.js'
import { staticTask } from '#gulp/tasks/static.js'
import { videoTask } from '#gulp/tasks/video.js'
import { audioTask } from '#gulp/tasks/audio.js'

import { validateModuleRegistry, validateWatchRules } from '#gulp/core/module-contract.js'
import { logger } from '#gulp/utils/logger.js'

/**
 * @typedef {'reload'|'task'} WatchAction
 * @typedef {'compile'|'watch'} ModuleKind
 * @typedef {{
 *   id: string,
 *   kind?: ModuleKind,
 *   tasks?: { dev?: Function, build?: Function, preview?: Function },
 *   order?: number,
 *   dependsOn?: string[],
 *   enabled?: (ctx:any)=>boolean,
 *   watch?: (ctx:any)=>Array<{key:string, globs:string|string[], task:Function, action:WatchAction}>
 * }} Module
 */

const stageToTaskKey = stage => (stage === STAGES.BUILD_FAST ? STAGES.BUILD : stage)

const pickTask = (tasks, stage) => {
  if (!tasks) return null
  const key = stageToTaskKey(stage)
  return tasks[key] || null
}

const byOrder = (a, b) =>
  (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id))

const dependsOnPolicy = stage => (stage === STAGES.DEV ? 'warn' : 'error')

const reportDependsOnMismatch = ({ stage, moduleId, depId }) => {
  const msg = `Module "${moduleId}" dependsOn "${depId}", but "${depId}" is disabled for stage "${stage}". Either enable "${depId}" or remove/adjust dependsOn.`
  const p = dependsOnPolicy(stage)
  if (p === 'warn') return logger.warn('registry', msg)
  throw new Error(`[registry] ${msg}`)
}

const _cache = new WeakMap()

const getCtxCache = ctx => {
  if (!ctx || typeof ctx !== 'object') return null
  const existing = _cache.get(ctx)
  if (existing) return existing
  const created = Object.create(null)
  _cache.set(ctx, created)
  return created
}

/**
 * Returns module registry.
 *
 * Notes:
 * - Some tasks are internally feature-gated, but we still gate them here to keep pipelines minimal.
 * - Watch rules are conservative and match existing behavior.
 */
export const getModuleRegistry = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.moduleRegistry) return cache.moduleRegistry

  const f = ctx.features
  const p = ctx.paths

  const prof = task => task

  const tTemplates = prof(templatesTask)
  const tStyles = prof(stylesTask)
  const tScripts = prof(scriptsTask)
  const tFonts = prof(fontsTask)
  const tImages = prof(imagesTask)
  const tSvg = prof(svgTask)
  const tSvgSprite = prof(svgSpriteTask)
  const tFavicons = prof(faviconsTask)
  const tStatic = prof(staticTask)
  const tVideo = prof(videoTask)
  const tAudio = prof(audioTask)

  /** @type {Module[]} */
  const modules = [
    {
      id: 'templates',
      kind: 'compile',
      order: 10,
      dependsOn: ['styles'],
      tasks: { dev: tTemplates, build: tTemplates, preview: tTemplates },
      enabled: () => true,
      watch: () => [
        {
          key: 'templates',
          globs: p.pages.watch,
          task: tTemplates,
          action: 'reload',
        },
      ],
    },
    {
      id: 'styles',
      kind: 'compile',
      order: 20,
      tasks: { dev: tStyles, build: tStyles, preview: tStyles },
      enabled: () => true,
      watch: () => [
        {
          key: 'styles',
          globs: p.styles.watch,
          task: tStyles,
          action: 'task',
        },
      ],
    },
    {
      id: 'scripts',
      kind: 'compile',
      order: 30,
      tasks: { dev: tScripts, build: tScripts, preview: tScripts },
      enabled: () => true,
      watch: () => [
        {
          key: 'scripts',
          globs: p.scripts.watch,
          task: tScripts,
          action: 'task',
        },
      ],
    },
    {
      id: 'fonts',
      kind: 'compile',
      order: 40,
      tasks: { dev: tFonts, build: tFonts, preview: tFonts },
      enabled: () => true,
      watch: () => [
        {
          key: 'fonts',
          globs: p.fonts.watch,
          task: tFonts,
          action: 'reload',
        },
      ],
    },
    {
      id: 'images',
      kind: 'compile',
      order: 50,
      tasks: { dev: tImages, build: tImages, preview: tImages },
      enabled: () => true,
      watch: () => [
        {
          key: 'images',
          globs: p.assets.images,
          task: tImages,
          action: 'reload',
        },
      ],
    },
    {
      id: 'svg',
      kind: 'compile',
      order: 60,
      tasks: { dev: tSvg, build: tSvg, preview: tSvg },
      enabled: () => true,
      watch: () => [
        {
          key: 'svg',
          globs: p.assets.svgs,
          task: tSvg,
          action: 'reload',
        },
      ],
    },
    {
      id: 'svgSprite',
      kind: 'compile',
      order: 70,
      tasks: { dev: tSvgSprite, build: tSvgSprite, preview: tSvgSprite },
      enabled: () => Boolean(f.svgSprite?.enabled),
      watch: () => [
        {
          key: 'svgSprite',
          globs: p.assets.icons,
          task: tSvgSprite,
          action: 'reload',
        },
      ],
    },
    {
      id: 'favicons',
      kind: 'compile',
      order: 80,
      tasks: { dev: tFavicons, build: tFavicons, preview: tFavicons },
      enabled: () => Boolean(f.favicons?.enabled),
      watch: () => [
        {
          key: 'favicons',
          globs: p.assets.favicons,
          task: tFavicons,
          action: 'reload',
        },
      ],
    },
    {
      id: 'static',
      kind: 'compile',
      order: 90,
      tasks: { dev: tStatic, build: tStatic, preview: tStatic },
      enabled: () => Boolean(f.static?.enabled),
      watch: () => [
        {
          key: 'static',
          globs: p.assets.static,
          task: tStatic,
          action: 'reload',
        },
      ],
    },
    {
      id: 'media.video',
      kind: 'compile',
      order: 100,
      tasks: { dev: tVideo, build: tVideo, preview: tVideo },
      enabled: () => Boolean(f.media?.video?.enabled),
      watch: () => [
        {
          key: 'video',
          globs: p.assets.video,
          task: tVideo,
          action: 'reload',
        },
      ],
    },
    {
      id: 'media.audio',
      kind: 'compile',
      order: 110,
      tasks: { dev: tAudio, build: tAudio, preview: tAudio },
      enabled: () => Boolean(f.media?.audio?.enabled),
      watch: () => [
        {
          key: 'audio',
          globs: p.assets.audio,
          task: tAudio,
          action: 'reload',
        },
      ],
    },
  ]

  if (f.i18n?.enabled) {
    modules.push({
      id: 'i18n.locales',
      kind: 'watch',
      order: 5,
      enabled: () => true,
      watch: () => [
        {
          key: 'locales',
          globs: 'src/data/locales/**/*.json',
          task: tTemplates,
          action: 'reload',
        },
      ],
    })
  }

  const registry = validateModuleRegistry(modules)
  if (cache) cache.moduleRegistry = registry
  return registry
}

const getEnabledModules = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.enabledModules) return cache.enabledModules

  const enabled = getModuleRegistry(ctx)
    .filter(m => (m.enabled ? m.enabled(ctx) : true))
    .sort(byOrder)

  if (cache) cache.enabledModules = enabled
  return enabled
}

const getRunnableModules = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.runnableModules) return cache.runnableModules

  const runnable = getEnabledModules(ctx)
    .map(m => ({ m, task: pickTask(m.tasks, ctx.stage) }))
    .filter(x => Boolean(x.task))

  if (cache) cache.runnableModules = runnable
  return runnable
}

export const getEnabledRunTasks = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.enabledRunTasks) return cache.enabledRunTasks
  const tasks = getRunnableModules(ctx).map(x => x.task)
  if (cache) cache.enabledRunTasks = tasks
  return tasks
}

export const getEnabledWatchRules = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.watchRules) return cache.watchRules
  const rules = validateWatchRules(getEnabledModules(ctx).flatMap(m => (m.watch ? m.watch(ctx) : [])))
  if (cache) cache.watchRules = rules
  return rules
}

/**
 * Returns compile layers based on dependsOn graph.
 * Each layer can be executed in parallel; layers must run in series.
 */

export const getEnabledCompileIds = ctx =>
  (() => {
    const cache = getCtxCache(ctx)
    if (cache?.enabledCompileIds) return cache.enabledCompileIds
    const ids = getEnabledModules(ctx)
      .filter(m => m.kind === 'compile' && pickTask(m.tasks, ctx.stage))
      .map(m => m.id)
    if (cache) cache.enabledCompileIds = ids
    return ids
  })()

export const getCompileLayers = ctx => {
  const cache = getCtxCache(ctx)
  if (cache?.compileLayers) return cache.compileLayers

  const allEnabled = getEnabledModules(ctx)
  const runnableCompile = getRunnableModules(ctx)
    .map(x => ({ ...x.m, __task: x.task }))
    .filter(m => m.kind === 'compile')

  /** @type {Map<string, any>} */
  const byIdAll = new Map(allEnabled.map(m => [m.id, m]))
  const runnableIds = new Set(runnableCompile.map(m => m.id))

  for (const m of runnableCompile) {
    for (const dep of m.dependsOn || []) {
      if (!byIdAll.has(dep)) continue
      if (!runnableIds.has(dep)) {
        reportDependsOnMismatch({ stage: ctx.stage, moduleId: m.id, depId: dep })
      }
    }
  }

  /** @type {Map<string, any>} */
  const byId = new Map(runnableCompile.map(m => [m.id, m]))

  /** @type {Map<string, Set<string>>} */
  const deps = new Map()
  /** @type {Map<string, number>} */
  const indeg = new Map()

  for (const m of runnableCompile) {
    const d = (m.dependsOn || []).filter(x => byId.has(x))
    deps.set(m.id, new Set(d))
    indeg.set(m.id, d.length)
  }

  /** @type {Array<Function[]>} */
  const layers = []
  /** @type {Set<string>} */
  const remaining = new Set(runnableCompile.map(m => m.id))

  while (remaining.size) {
    const layerIds = [...remaining].filter(id => (indeg.get(id) || 0) === 0)

    if (!layerIds.length) {
      const cycle = [...remaining].join(', ')
      throw new Error(`[registry] Cyclic dependsOn detected among: ${cycle}`)
    }

    const layer = layerIds
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort(byOrder)
      .map(m => m.__task)
      .filter(Boolean)

    layers.push(layer)

    for (const id of layerIds) {
      remaining.delete(id)

      for (const otherId of remaining) {
        const otherDeps = deps.get(otherId)
        if (otherDeps && otherDeps.has(id)) {
          otherDeps.delete(id)
          indeg.set(otherId, Math.max(0, (indeg.get(otherId) || 0) - 1))
        }
      }
    }
  }

  if (cache) cache.compileLayers = layers
  return layers
}

/**
 * Declarative execution plan. The pipeline builder converts this into gulp.series/parallel.
 *
 * Steps:
 * - series: tasks executed sequentially
 * - parallel: tasks executed concurrently
 */
