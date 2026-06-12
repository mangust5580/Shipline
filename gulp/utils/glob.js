import path from 'node:path'
import fg from 'fast-glob'

export const toPosix = p =>
  String(p || '')
    .split(path.sep)
    .join('/')

const normalizePatterns = patterns => {
  if (Array.isArray(patterns)) return patterns.map(p => toPosix(p))
  return toPosix(patterns)
}

export const isMatch = fg.isMatch

export const glob = (patterns, options = {}) =>
  fg(normalizePatterns(patterns), {
    dot: false,
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: true,
    ...options,
  })

export const globSafe = async (patterns, options = {}) => {
  try {
    return await glob(patterns, options)
  } catch {
    return []
  }
}

export const stripQueryAndHash = url => {
  const idxQ = url.indexOf('?')
  const idxH = url.indexOf('#')
  const idx = idxQ === -1 ? idxH : idxH === -1 ? idxQ : Math.min(idxQ, idxH)
  return idx === -1 ? url : url.slice(0, idx)
}
