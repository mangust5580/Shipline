import {site} from '#config/site.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseSeo = {
  trailingSlash: false,

  robots: {
    allowAll: true,
  },

  sitemap: {
    mode: 'index',
    changefreq: 'weekly',
    priority: 0.5,
  },

  url: {
    siteUrl: site.siteUrl,
    basePath: site.basePath,
  },
}

export const seo = await loadUserConfig(baseSeo, 'seo')
