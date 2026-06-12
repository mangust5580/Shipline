import { env } from '#gulp/utils/env.js'

const onceKeys = new Set()

const fmt = (scope, msg) => (scope ? `[${scope}] ${msg}` : String(msg))

const log = (fn, scope, msg) => fn(fmt(scope, msg))

export const logger = {
  info(scope, msg) {
    log(console.log, scope, msg)
  },
  warn(scope, msg) {
    log(console.warn, scope, msg)
  },
  error(scope, msg) {
    log(console.error, scope, msg)
  },

  dev(scope, msg) {
    if (!env.isDev) return
    log(console.log, scope, msg)
  },

  once(key, scope, msg, { devOnly = true } = {}) {
    if (devOnly && !env.isDev) return
    if (onceKeys.has(key)) return
    onceKeys.add(key)
    log(console.log, scope, msg)
  },
}
