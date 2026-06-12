import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseImages = {
  extensions: {
    raster: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'],
    vector: [],
  },

  dev: {
    mode: 'derived',
    allowEmpty: true,
    concurrency: 16,
    retina: { enabled: true, suffix: '@2x', scale: 2, generate1xFrom2x: true },
    formats: { webp: false, avif: false },
  },

  prod: {
    allowEmpty: true,
    concurrency: 6,
    retina: { enabled: true, suffix: '@2x', scale: 2, generate1xFrom2x: true },
    formats: { webp: false, avif: false },
    quality: {
      jpeg: { quality: 78, mozjpeg: true, progressive: true },
      png: { compressionLevel: 9, palette: true },
      webp: { quality: 76 },
      avif: { quality: 46 },
    },
  },

  exclude: {
    optimize: [],
    generateFormats: [],
  },

  responsive: {
    enabled: false,
    widths: [320, 480, 640, 768, 1024, 1280],
    keepOriginal: true,
    minSourceWidth: 640,
  },

  rules: [],
}

export const images = await loadUserConfig(baseImages, 'images')
