import { loadUserConfig } from '#gulp/utils/load-user-config.js'
import { site } from './site.js'

const baseFavicons = {

  files: {
    svg: 'favicon.svg',
    ico: 'favicon.ico',
    apple: 'apple-touch-icon.png',
    manifest: 'manifest.webmanifest',
    pwa192: 'icon-192.png',
    pwa512: 'icon-512.png',
    maskable: 'icon-mask.png',
  },

  sizes: {
    apple: 180,
    pwa192: 192,
    pwa512: 512,
    ico: [32, 48],
  },

  manifest: {
    name: site.name,
    short_name: site.shortName || site.name,
    display: 'standalone',
    start_url: '.',
    background_color: '#ffffff',
    theme_color: '#ffffff',
  },
}

export const favicons = await loadUserConfig(baseFavicons, 'favicons')
