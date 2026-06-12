import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const envUrl = (process.env.SITE_URL || '').trim()
const envBasePath = (process.env.SITE_BASE_PATH || '').trim()

const normalizeSiteUrl = (url) => String(url || '').trim().replace(/\/+$/g, '')

const normalizeBasePath = (basePath) => {
  let bp = String(basePath || '').trim()
  if (bp === '/') bp = ''
  if (bp && !bp.startsWith('/')) bp = `/${bp}`
  bp = bp.replace(/\/+$/g, '')
  return bp
}

const baseSite = {
  siteUrl: normalizeSiteUrl(envUrl || ''),
  basePath: normalizeBasePath(envBasePath || ''),

  name: (process.env.SITE_NAME || '').trim() || 'Gulp Frontend Starter',
  shortName: (process.env.SITE_SHORT_NAME || '').trim() || 'Gulp Starter',
}

export const site = await loadUserConfig(baseSite, 'site')
