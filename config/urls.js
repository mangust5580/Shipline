import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseUrls = {
  anchorStyle: 'slash-hash',
  pageExt: '.html',
  relative: true,
  canonical: {
    enabled: true,
    absolute: true,
  },
  og: {
    absolute: true,
  },
}

export const urls = await loadUserConfig(baseUrls, 'urls')
