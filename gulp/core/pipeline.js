import gulp from 'gulp'

import { STAGES } from '#gulp/constants.js'
import { env } from '#gulp/utils/env.js'

import { features } from '#config/features.js'

import { clean } from '#gulp/tasks/clean.js'
import { lintScriptsTask } from '#gulp/tasks/lint-scripts.js'
import { lintStylesTask } from '#gulp/tasks/lint-styles.js'
import { versioningTask } from '#gulp/tasks/versioning.js'
import { seoTask } from '#gulp/tasks/seo.js'
import { createValidateStructureTask } from '#gulp/tasks/validate-structure.js'
import { createValidateAssetsTask } from '#gulp/tasks/validate-assets.js'
import { createReportSizesTask } from '#gulp/tasks/report-sizes.js'

import { createContext } from '#gulp/core/context.js'
import { getCompileLayers, getEnabledCompileIds } from '#gulp/core/registry.js'
import { profileTask } from '#gulp/core/profiler.js'

process.env.NODE_ENV = env.isProd ? 'production' : 'development'

const noop = done => done()

const toSeries = tasks => (tasks.length ? gulp.series(...tasks) : noop)
const toParallelOrSeries = tasks => (tasks.length > 1 ? gulp.parallel(...tasks) : tasks[0] || noop)

const shouldRunValidateStructure = stage => {
  const q = features.quality || {}
  const enabled = q.validateStructure?.enabled !== false
  if (!enabled) return false

  if (stage === STAGES.DEV) return q.validateStructureOnDevStart !== false
  if (stage === STAGES.PREVIEW) return q.validateStructureOnPreview !== false
  return q.validateStructureOnBuild !== false
}

const topoSort = nodes => {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const indeg = new Map()
  const deps = new Map()

  for (const n of nodes) {
    const d = (n.dependsOn || []).filter(x => byId.has(x))
    deps.set(n.id, new Set(d))
    indeg.set(n.id, d.length)
  }

  const remaining = new Set(nodes.map(n => n.id))
  const ordered = []

  while (remaining.size) {
    const ready = [...remaining].filter(id => (indeg.get(id) || 0) === 0)
    if (!ready.length) {
      const cycle = [...remaining].join(', ')
      throw new Error(`[pipeline] Cyclic dependsOn detected among post tasks: ${cycle}`)
    }

    ready.sort((a, b) => String(a).localeCompare(String(b)))

    for (const id of ready) {
      remaining.delete(id)
      ordered.push(byId.get(id)?.task)

      for (const otherId of remaining) {
        const otherDeps = deps.get(otherId)
        if (otherDeps && otherDeps.has(id)) {
          otherDeps.delete(id)
          indeg.set(otherId, Math.max(0, (indeg.get(otherId) || 0) - 1))
        }
      }
    }
  }

  return ordered.filter(Boolean)
}

const buildPipeline = ({ ctx, tasks }) => {
  const compileLayers = getCompileLayers(ctx)
  const steps = []

  if (tasks.validateStructure && shouldRunValidateStructure(ctx.stage)) {
    steps.push(toSeries([tasks.validateStructure]))
  }

  if (ctx.stage !== STAGES.DEV) {
    steps.push(toSeries([tasks.lintScripts, tasks.lintStyles].filter(Boolean)))
  }

  steps.push(toSeries([tasks.clean].filter(Boolean)))

  for (const layer of compileLayers) {
    steps.push(toParallelOrSeries(layer.filter(Boolean)))
  }

  if (ctx.stage === STAGES.DEV) {
    steps.push(toSeries([tasks.server, tasks.watch].filter(Boolean)))
  } else {
    const compileIds = getEnabledCompileIds(ctx)

    const lastBuildId = tasks.seo ? 'seo' : tasks.versioning ? 'versioning' : null
    const postDepends = lastBuildId ? [lastBuildId] : compileIds

    const postNodes = [
      { id: 'versioning', task: tasks.versioning, dependsOn: compileIds },
      {
        id: 'seo',
        task: tasks.seo,
        dependsOn: [tasks.versioning ? 'versioning' : null].filter(Boolean),
      },
      { id: 'validateAssets', task: tasks.validateAssets, dependsOn: postDepends },
      { id: 'reportSizes', task: tasks.reportSizes, dependsOn: postDepends },
    ].filter(n => Boolean(n.task))

    if (postNodes.length) steps.push(toSeries(topoSort(postNodes)))
  }

  return toSeries(steps)
}

export const createBuildPipeline = ({ stage }) => {
  const ctx = createContext({ stage })
  const prof = (task, name) => profileTask(task, name, ctx)

  return buildPipeline({
    ctx,
    tasks: {
      validateStructure: prof(createValidateStructureTask({ stage }), 'validateStructure'),
      lintScripts: prof(lintScriptsTask, 'lintScripts'),
      lintStyles: prof(lintStylesTask, 'lintStyles'),
      clean: prof(clean, 'clean'),
      versioning: prof(versioningTask, 'versioning'),
      seo: prof(seoTask, 'seo'),
      validateAssets: prof(createValidateAssetsTask({ stage }), 'validateAssets'),
      reportSizes: prof(createReportSizesTask({ stage }), 'reportSizes'),
    },
  })
}

export const createDevPipeline = ({ serverTask, watchTask }) => {
  const ctx = createContext({ stage: STAGES.DEV })
  const prof = (task, name) => profileTask(task, name, ctx)

  return buildPipeline({
    ctx,
    tasks: {
      validateStructure: prof(createValidateStructureTask({ stage: STAGES.DEV }), 'validateStructure'),
      clean: prof(clean, 'clean'),
      server: prof(serverTask, 'server'),
      watch: prof(watchTask(ctx), 'watch'),
    },
  })
}
