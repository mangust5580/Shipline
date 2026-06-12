import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

const deepMerge = (base, extra) => {
  if (!isPlainObject(extra)) return base
  const out = isPlainObject(base) ? { ...base } : base

  for (const [k, v] of Object.entries(extra)) {
    if (isPlainObject(v) && isPlainObject(out?.[k])) {
      out[k] = deepMerge(out[k], v)
    } else {
      out[k] = v
    }
  }

  return out
}

/**
 * Loads optional user config from project root (config.js).
 * Supports:
 *  - CommonJS: module.exports = {...}
 *  - ESM: export default {...} (loaded via dynamic import)
 *
 * Returns merged config object.
 */
export async function loadUserConfig(baseConfig, sectionName) {
  const configPath = path.resolve(process.cwd(), 'config.js')
  if (!fs.existsSync(configPath)) return baseConfig

  let userConfig
  try {
    userConfig = require(configPath)
    userConfig = userConfig?.default ?? userConfig
  } catch (err) {
    const msg = String(err?.message || '')
    const code = err?.code
    const isEsmAlias =
      code === 'ERR_REQUIRE_ESM' ||
      msg.includes('Unexpected token export') ||
      msg.includes('Cannot use import statement outside a module')

    try {
      const mod = await import(pathToFileURL(configPath).href)
      userConfig = mod?.default ?? mod
    } catch (err2) {
      const e = isEsmAlias ? err2 : err
      const eMsg = e?.message || String(e)
      const hint =
        e instanceof SyntaxError
          ? 'Syntax error'
          : e?.code
            ? `Error code: ${e.code}`
            : 'Runtime error'

      console.error(`[config] Failed to load config.js (${hint}). ${eMsg}`)
      throw new Error(`[config] Failed to load config.js. ${hint}. ${eMsg}`)
    }
  }

  if (!isPlainObject(userConfig)) return baseConfig

  const section = userConfig[sectionName]
  if (!isPlainObject(section)) return baseConfig

  return deepMerge(baseConfig, section)
}
