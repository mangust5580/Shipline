import fs from 'node:fs'
import path from 'node:path'

import { STAGES } from '#gulp/constants.js'
import { globSafe, toPosix } from '#gulp/utils/glob.js'
import { logger } from '#gulp/utils/logger.js'

const hasAny = async pattern => {
  const files = await globSafe(pattern, { onlyFiles: true, absolute: true })
  return files.length > 0
}

const pickPolicy = ({ stage, policy }) => {
  if (!policy || typeof policy !== 'object') return null
  const isDev = stage === STAGES.DEV
  return isDev ? policy.onDisabledFilesDev : policy.onDisabledFilesBuild
}

/**
 * Applies a simple stage-aware policy for disabled-feature file presence.
 * policy values: 'ignore' | 'warn' | 'error'
 */
export const applyDisabledFilesPolicy = ({ stage, msg, policy, fallback }) => {
  const p = pickPolicy({ stage, policy })
  if (p === 'ignore') return
  if (p === 'warn') return logger.warn('structure', msg)
  if (p === 'error') throw new Error(`[structure] ${msg}`)
  return typeof fallback === 'function' ? fallback() : undefined
}

/**
 * Ensures that when a feature/module is disabled, matching files do not exist.
 * If they exist, applies the provided policy.
 */
export const ensureNoDisabledFiles = async ({
  stage,
  enabled,
  baseDir,
  glob,
  msg,
  policy,
  fallback,
}) => {
  if (enabled) return

  const base = baseDir ? String(baseDir) : null
  if (base && !fs.existsSync(base)) return

  const pattern = glob ? String(glob) : base ? toPosix(path.join(base, '**/*')) : null
  if (!pattern) return

  const found = await hasAny(pattern)
  if (!found) return

  applyDisabledFilesPolicy({ stage, msg, policy, fallback })
}
