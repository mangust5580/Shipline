import { logger } from '#gulp/utils/logger.js'

function toPromise(ret) {
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

/**
 * Creates a scheduler.
 *
 * - debounces bursts (one run after debounceMs)
 * - ensures single-flight per key
 * - if something changes during a run, executes exactly one extra run
 */
export function createScheduler({ debounceMs = 150 } = {}) {
  const state = new Map()

  function get(key) {
    if (!state.has(key)) {
      state.set(key, {
        timer: null,
        running: false,
        queued: false,
        lastFn: null,
      })
    }
    return state.get(key)
  }

  function runNow(key) {
    const s = get(key)
    if (!s.lastFn) return

    if (s.running) {
      s.queued = true
      return
    }

    s.running = true

    toPromise(s.lastFn())
      .catch(err => {
        logger.error(`watch:${key}`, err?.stack || err?.message || String(err))
      })
      .finally(() => {
        s.running = false
        if (s.queued) {
          s.queued = false
          runNow(key)
        }
      })
  }

  function schedule(key, fn) {
    const s = get(key)
    s.lastFn = fn

    if (s.timer) clearTimeout(s.timer)
    s.timer = setTimeout(() => {
      s.timer = null
      runNow(key)
    }, debounceMs)
  }

  function close() {
    for (const s of state.values()) {
      if (s.timer) clearTimeout(s.timer)
    }
    state.clear()
  }

  return { schedule, close }
}
