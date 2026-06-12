import { env } from '#gulp/utils/env.js'
import { logger } from '#gulp/utils/logger.js'

const moduleCache = new Map()
const onceLog = new Set()

function logOnce(message) {
  if (!env.isDev) return
  if (onceLog.has(message)) return
  onceLog.add(message)

  logger.dev('lazy', message)
}

/**
 * Lazy-loads a module once per process.
 * - Uses dynamic import() and caches the resolved module.
 * - Optionally logs a single dev-only line when skipped.
 */
export async function lazyImport(moduleName, { enabled = true, skipLog } = {}) {
  if (!enabled) {
    if (skipLog) logOnce(skipLog)
    return null
  }

  if (moduleCache.has(moduleName)) return moduleCache.get(moduleName)

  const modPromise = import(moduleName)
  moduleCache.set(moduleName, modPromise)
  return modPromise
}

export async function lazyDefault(moduleName, options) {
  const mod = await lazyImport(moduleName, options)
  return mod ? mod.default : null
}

export async function lazyNamed(moduleName, exportName, options) {
  const mod = await lazyImport(moduleName, options)
  return mod ? mod[exportName] : null
}
