import fs from 'node:fs/promises'
import path from 'node:path'

import { globSafe } from '#gulp/utils/glob.js'
import { logger } from '#gulp/utils/logger.js'
import { normalizeBasePath, withBasePath } from '#gulp/utils/url-path.js'
import { SitemapStream, streamToPromise } from 'sitemap'

import { paths } from '#config/paths.js'
import { features } from '#config/features.js'
import { seo } from '#config/seo.js'
import { getI18nConfig } from '#gulp/utils/i18n.js'

const getSiteUrl = () =>
  String(seo.url?.siteUrl || '')
    .trim()
    .replace(/\/+$/g, '')

const isCI = Boolean(process.env.CI)

const shouldRequireSiteUrl = () => {
  const rule = features.seo?.requireSiteUrl

  if (isCI) return rule?.ci !== false
  return Boolean(rule?.local)
}

const basePath = () => normalizeBasePath(seo.url?.basePath || '')

const urlForRelHtml = (siteUrl, relHtml) => {
  const rel = String(relHtml || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  let urlPath = `/${rel}`.replace(/\/+/g, '/')

  if (urlPath.endsWith('/index.html')) {
    urlPath = urlPath.replace(/index\.html$/, '')
  }

  urlPath = withBasePath(urlPath, basePath())
  return `${siteUrl}${urlPath}`
}

const shouldIncludeInSitemap = async (relHtml) => {
  const html = await fs.readFile(path.join(paths.out, relHtml), 'utf8')
  const robotsMeta = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*>/i)?.[0] || ''
  const robotsContent = robotsMeta.match(/\scontent=["']([^"']*)["']/i)?.[1] || ''

  return !robotsContent
    .split(',')
    .map(value => value.trim().toLowerCase())
    .includes('noindex')
}

export const seoTask = async () => {
  if (!features.seo?.enabled) return

  if (features.seo.robots) {
    const robotsPath = path.join(paths.out, 'robots.txt')
    if (seo.robots?.content) {
      await fs.writeFile(robotsPath, seo.robots.content, 'utf8')
    } else {
      const lines = ['User-agent: *']
      lines.push(seo.robots?.allowAll ? 'Disallow:' : 'Disallow: /')
      await fs.writeFile(robotsPath, lines.join('\n') + '\n', 'utf8')
    }
  }

  if (!features.seo.sitemap) return

  const siteUrl = getSiteUrl()
  if (!siteUrl) {
    const msg =
      'site.siteUrl is not set. Sitemap/hreflang generation is skipped locally. ' +
      'Set SITE_URL and SITE_BASE_PATH (or config/site.js) to enable sitemap/hreflang generation.'

    if (shouldRequireSiteUrl()) {
      throw new Error(
        '[seo] site.siteUrl is required to generate sitemap/hreflang. Set it in config/site.js.',
      )
    }

    logger.warn('seo', msg)
    return
  }

  const i18n = getI18nConfig()
  const htmlFiles = await globSafe('**/*.html', {
    cwd: paths.out,
    onlyFiles: true,
  })
  if (!htmlFiles.length) return

  const sitemapHtmlFiles = []
  for (const rel of htmlFiles) {
    if (await shouldIncludeInSitemap(rel)) sitemapHtmlFiles.push(rel)
  }
  if (!sitemapHtmlFiles.length) return

  const mode = seo.sitemap?.mode || 'index'
  const cfgFreq = seo.sitemap?.changefreq || 'weekly'
  const cfgPriority = seo.sitemap?.priority ?? 0.5

  const writeSitemap = async (filename, relList) => {
    const sm = new SitemapStream({ hostname: siteUrl })
    for (const rel of relList) {
      sm.write({
        url: urlForRelHtml(siteUrl, rel).replace(siteUrl, ''),
        changefreq: cfgFreq,
        priority: cfgPriority,
      })
    }
    sm.end()
    const xml = await streamToPromise(sm)
    await fs.writeFile(path.join(paths.out, filename), xml.toString(), 'utf8')
  }

  if (features.i18n?.enabled && mode === 'index') {
    const byLocale = new Map()
    for (const loc of i18n.locales) byLocale.set(loc, [])
    for (const rel of sitemapHtmlFiles) {
      const parts = rel.split('/')
      const maybe = parts[0]
      if (byLocale.has(maybe)) byLocale.get(maybe).push(rel)
      else {
        byLocale.get(i18n.defaultLocale)?.push(rel)
      }
    }

    const indexEntries = []
    for (const [loc, list] of byLocale.entries()) {
      if (!list.length) continue
      const filename = `sitemap-${loc}.xml`
      await writeSitemap(filename, list)
      indexEntries.push(filename)
    }

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...indexEntries.map(f =>
        `  <sitemap><loc>${siteUrl}${basePath()}/${f}</loc></sitemap>`.replace(/\/+/g, '/'),
      ),
      '</sitemapindex>',
      '',
    ]
    await fs.writeFile(path.join(paths.out, 'sitemap.xml'), lines.join('\n'), 'utf8')
    return
  }

  await writeSitemap('sitemap.xml', sitemapHtmlFiles)
}
