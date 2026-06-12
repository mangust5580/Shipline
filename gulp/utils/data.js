import fs from 'node:fs'
import path from 'node:path'

import { templates } from '#config/templates.js'
import { lazyNamed } from '#gulp/utils/lazy.js'

const cache = new Map()

const toAbs = filepath => {
  if (!filepath) return null
  return path.isAbsolute(filepath) ? filepath : path.join(process.cwd(), filepath)
}

const readFileSafe = abs => {
  if (!abs) return null
  if (!fs.existsSync(abs)) return null
  const raw = fs.readFileSync(abs, 'utf8')
  return raw
}

const parseJson = (raw, abs) => {
  if (!raw || !raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`[data] Failed to parse JSON: ${abs}. ${e?.message || e}`)
  }
}

const parseYaml = async (raw, abs) => {
  if (!raw || !raw.trim()) return {}
  const load = await lazyNamed('js-yaml', 'load')
  if (!load) {
    throw new Error('[data] YAML support requires "js-yaml" dependency.')
  }
  try {
    const data = load(raw)
    return data && typeof data === 'object' ? data : {}
  } catch (e) {
    throw new Error(`[data] Failed to parse YAML: ${abs}. ${e?.message || e}`)
  }
}

const readDataFile = async filepath => {
  const abs = toAbs(filepath)
  if (!abs) return {}

  const stat = fs.existsSync(abs) ? fs.statSync(abs) : null
  if (!stat) return {}

  const cached = cache.get(abs)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data

  const raw = readFileSafe(abs)
  if (raw === null) return {}

  const ext = path.extname(abs).toLowerCase()

  let data = {}
  if (ext === '.json') data = parseJson(raw, abs)
  else if (ext === '.yml' || ext === '.yaml') data = await parseYaml(raw, abs)
  else {
    throw new Error(
      `[data] Unsupported data file extension: ${ext} (${abs}). Use .json / .yml / .yaml.`,
    )
  }

  cache.set(abs, { mtimeMs: stat.mtimeMs, data })
  return data
}

export const getGlobals = async () => readDataFile(templates.data?.globals)
