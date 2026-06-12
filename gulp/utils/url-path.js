export const normalizeBasePath = basePath => {
  let bp = String(basePath || '')
    .trim()
    .replace(/\\/g, '/')
  if (bp === '/' || bp === '') return ''
  if (!bp.startsWith('/')) bp = `/${bp}`
  bp = bp.replace(/\/+$/g, '')
  bp = bp.replace(/\/+/g, '/')
  return bp === '/' ? '' : bp
}

export const normalizeUrlPath = p => {
  let s = String(p || '')
    .trim()
    .replace(/\\/g, '/')
  if (!s) return '/'
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return s
  if (!s.startsWith('/')) s = `/${s}`
  s = s.replace(/\/+/g, '/')
  return s
}

export const joinUrlPath = (...parts) => {
  const cleaned = parts
    .map(p =>
      String(p || '')
        .trim()
        .replace(/\\/g, '/'),
    )
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/+$/g, '') : p.replace(/^\/+|\/+$/g, '')))

  if (!cleaned.length) return '/'
  let out = cleaned.join('/')
  out = out.replace(/\/+/g, '/')
  if (
    !out.startsWith('/') &&
    !out.startsWith('http://') &&
    !out.startsWith('https://') &&
    !out.startsWith('//')
  ) {
    out = `/${out}`
  }
  return out
}

export const withBasePath = (urlPath, basePath) => {
  const bp = normalizeBasePath(basePath)
  const p = normalizeUrlPath(urlPath)

  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p
  if (!bp) return p

  if (p === '/') return `${bp}/`
  return (bp + p).replace(/\/+/g, '/')
}

export const stripBasePath = (urlPath, basePath) => {
  const bp = normalizeBasePath(basePath)
  let p = String(urlPath || '')
    .trim()
    .replace(/\\/g, '/')

  if (!bp) return p
  if (!p) return p

  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p

  if (!p.startsWith('/')) return p

  p = p.replace(/\/+/g, '/')

  if (p === bp) return '/'
  if (p.startsWith(bp + '/')) return p.slice(bp.length) || '/'
  return p
}
