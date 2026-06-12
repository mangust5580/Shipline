import path from 'node:path'

export const normalizeFsPath = p => {
  const s = String(p || '')
  if (!s) return s
  return path.normalize(s)
}

export const toPosixPath = p =>
  String(p || '')
    .split(path.sep)
    .join('/')

export const normalizeGlob = pattern => {
  if (Array.isArray(pattern)) return pattern.map(normalizeGlob)
  return toPosixPath(pattern)
}
