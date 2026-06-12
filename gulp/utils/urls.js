import path from 'node:path'

import { site } from '#config/site.js'
import { urls as urlsConfig } from '#config/urls.js'

const stripSlashes = s => String(s || '').replace(/^\/+|\/+$/g, '')
const ensureLeadingSlash = s => (s && s.startsWith('/') ? s : `/${s}`)

const joinUrlPath = (...parts) => {
  const cleaned = parts
    .filter(Boolean)
    .map(p => stripSlashes(p))
    .filter(Boolean)
  return cleaned.length ? `/${cleaned.join('/')}` : ''
}

const withBasePath = p => {
  const bp = site.basePath || ''
  const out = joinUrlPath(bp, p)
  return out || '/'
}

const withSiteUrl = p => {
  const su = String(site.siteUrl || '').replace(/\/+$/g, '')
  if (!su) return p
  return `${su}${p === '/' ? '' : p}`
}

const ensurePageExt = p => {
  const ext = urlsConfig.pageExt || '.html'
  if (!p) return ''
  if (p.endsWith('/')) return p
  if (p.endsWith(ext)) return p
  if (path.extname(p)) return p
  return `${p}${ext}`
}

const makeAnchor = (pagePath, anchor) => {
  const a = String(anchor || '').replace(/^#/, '')
  if (!a) return pagePath

  const style = urlsConfig.anchorStyle || 'slash-hash'

  if (style === 'hash') return `#${a}`

  if (style === 'index-hash') {
    const page = ensurePageExt(pagePath || 'index')
    const p = withBasePath(ensureLeadingSlash(page))
    return `${p}#${a}`
  }

  const p = withBasePath(pagePath || '/')
  return `${p}#${a}`
}

export const createUrlHelpers = () => {
  const toPath = p => withBasePath(p)

  const page = p => {
    const normalized = ensurePageExt(stripSlashes(p))
    return withBasePath(normalized)
  }

  const asset = p => withBasePath(stripSlashes(p))

  const canonical = p => {
    const enabled = urlsConfig.canonical?.enabled !== false
    if (!enabled) return null
    const href = toPath(p)
    const abs = urlsConfig.canonical?.absolute !== false
    return abs ? withSiteUrl(href) : href
  }

  const ogImage = p => {
    const href = asset(p)
    const abs = urlsConfig.og?.absolute !== false
    return abs ? withSiteUrl(href) : href
  }

  return Object.freeze({
    basePath: site.basePath || '',
    siteUrl: site.siteUrl || '',
    path: toPath,
    page,
    asset,
    anchor: makeAnchor,
    canonical,
    ogImage,
  })
}
