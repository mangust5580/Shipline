import { logger } from '#gulp/utils/logger.js'

const enabled =
  process.env.PROFILE === '1' ||
  process.env.PROFILE === 'true' ||
  process.env.GULP_PROFILE === '1' ||
  process.env.GULP_PROFILE === 'true'

const timings = new Map()

const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now()
  return Date.now()
}

const fmtMs = ms => `${Math.round(ms)}ms`

const record = (name, ms) => {
  const cur = timings.get(name) || { totalMs: 0, count: 0 }
  cur.totalMs += ms
  cur.count += 1
  timings.set(name, cur)
}

const reportOnceOnExit = (() => {
  let armed = false
  return () => {
    if (armed) return
    armed = true

    const print = () => {
      if (!enabled) return
      const rows = [...timings.entries()]
        .map(([name, v]) => ({
          name,
          totalMs: v.totalMs,
          count: v.count,
          avgMs: v.totalMs / Math.max(1, v.count),
        }))
        .sort((a, b) => b.totalMs - a.totalMs)

      if (!rows.length) return

      logger.info('profile', 'Task timings (top):')
      for (const r of rows.slice(0, 20)) {
        logger.info('profile', `${r.name}: total ${fmtMs(r.totalMs)} | avg ${fmtMs(r.avgMs)} | x${r.count}`)
      }
    }

    process.once('exit', print)
  }
})()

export const profileTask = (task, name = task?.name || 'task', ctx = null) => {
  if (!enabled || typeof task !== 'function') return task
  reportOnceOnExit()

  const label = ctx?.stage ? `${name}@${ctx.stage}` : String(name)

  return function profiledTask(done) {
    const t0 = now()
    let finished = false

    const finish = err => {
      if (finished) return
      finished = true
      const ms = now() - t0
      record(label, ms)
      logger.dev('profile', `${label}: ${fmtMs(ms)}`)
      done(err)
    }

    try {
      if (task.length >= 1) {
        const res = task(finish)
        if (res && typeof res.then === 'function') res.then(() => finish()).catch(finish)
        return
      }

      const res = task()
      if (!res) return finish()

      if (typeof res.then === 'function') return res.then(() => finish()).catch(finish)
      if (typeof res.on === 'function') {
        res.on('error', finish)
        res.on('end', () => finish())
        res.on('finish', () => finish())
        return
      }

      return finish()
    } catch (e) {
      return finish(e)
    }
  }
}
