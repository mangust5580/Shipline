import path from 'node:path'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import crypto from 'node:crypto'

const root = process.cwd()

export const cachePaths = {
  root: path.join(root, '.cache'),
  mediaRoot: path.join(root, '.cache', 'media'),
  mediaIndex: path.join(root, '.cache', 'media', 'index.json'),
}

async function ensureDir(absDir) {
  await fs.mkdir(absDir, { recursive: true })
}

export function stableHash(value) {
  const json = JSON.stringify(stableClone(value))
  return crypto.createHash('sha1').update(json).digest('hex').slice(0, 12)
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = stableClone(value[key])
    }
    return out
  }
  return value
}

export function fileSigFromStat(st) {
  return `${st.size}:${Math.trunc(st.mtimeMs)}`
}

export async function readMediaIndex() {
  try {
    const buf = await fs.readFile(cachePaths.mediaIndex, 'utf8')
    const data = JSON.parse(buf)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export async function writeMediaIndex(index) {
  await ensureDir(cachePaths.mediaRoot)
  await fs.writeFile(cachePaths.mediaIndex, JSON.stringify(index, null, 2), 'utf8')
}

export function mediaCacheDirFor(kind, relNoExtPosix) {
  const parts = relNoExtPosix.split('/').filter(Boolean)
  return path.join(cachePaths.mediaRoot, kind, ...parts.slice(0, -1))
}

export function mediaBaseNameFor(relNoExtPosix) {
  const parts = relNoExtPosix.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

export async function ensureFileExists(absPath) {
  try {
    await fs.access(absPath)
    return true
  } catch {
    return false
  }
}

export function isDirPresent(absDir) {
  try {
    return fssync.existsSync(absDir)
  } catch {
    return false
  }
}
