import gulp from 'gulp'

import { STAGES } from '#gulp/constants.js'

import { clean, cleanAll } from '#gulp/tasks/clean.js'
import { serverTask } from '#gulp/tasks/server.js'
import { watchTask } from '#gulp/tasks/watch.js'

import { createBuildPipeline, createDevPipeline } from '#gulp/core/pipeline.js'

export { clean, cleanAll }

export const build = createBuildPipeline({ stage: STAGES.BUILD })

export const buildFast = createBuildPipeline({ stage: STAGES.BUILD_FAST })

export const dev = createDevPipeline({ serverTask, watchTask })

export const preview = gulp.series(createBuildPipeline({ stage: STAGES.PREVIEW }), done =>
  serverTask(done),
)

export const devCheck = build
export const previewCheck = build
