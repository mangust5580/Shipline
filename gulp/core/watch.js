import gulp from 'gulp'

import { createScheduler } from '#gulp/utils/scheduler.js'
import { getWatchRules } from '#gulp/core/modules.js'

const toPromise = ret => {
  if (!ret) return Promise.resolve()
  if (typeof ret?.then === 'function') return ret

  if (typeof ret?.on === 'function') {
    return new Promise((resolve, reject) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      ret.on('finish', finish)
      ret.on('end', finish)
      ret.on('close', finish)
      ret.on('error', reject)
    })
  }

  return Promise.resolve()
}

  const withReload = (reload, fn) => () =>
  toPromise(fn()).then(() => {
    try {
      reload?.()
    } catch {
      return undefined
    }
  })

export const createWatchTask = ctx => {
  const scheduler = createScheduler({ debounceMs: ctx?.project?.watch?.debounceMs ?? 150 })

  const watchOptions = {
    ignoreInitial: true,
    awaitWriteFinish: ctx?.project?.watch?.awaitWriteFinish ?? {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  }

  const rules = getWatchRules(ctx)
  const reload = ctx?.plugins?.browserSync?.reload

  return function watchTask(done) {
    for (const r of rules) {
      const handler = r.reload ? withReload(reload, r.task) : r.task
      gulp.watch(r.globs, watchOptions).on('all', () => scheduler.schedule(r.key, handler))
    }

    done()
  }
}
