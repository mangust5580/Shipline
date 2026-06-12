import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseVersioning = {
  include: {
    styles: true,
    scripts: true,
    images: false,
    fonts: false,
  },

  globsByGroup: {
    styles: ['styles/**/*.{css,map}'],
    scripts: ['scripts/**/*.{js,map}'],
    images: ['images/**/*.{png,jpg,jpeg,webp,avif,gif,ico,svg}'],
    fonts: ['fonts/**/*.{woff,woff2,ttf,otf,eot}'],
  },

  assetsGlobs: ['styles/**/*.{css,map}', 'scripts/**/*.{js,map}'],
  rewriteGlobs: ['**/*.html', 'styles/**/*.css', 'scripts/**/*.js'],
  manifestName: 'rev-manifest.json',
}

export const versioning = await loadUserConfig(baseVersioning, 'versioning')
