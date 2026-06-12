import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseLint = {

  enabled: {
    styles: true,
    scripts: true,
  },

  strict: {
    styles: true,
    scripts: true,
  },

  globs: {
    styles: ['src/**/*.{css,scss}'],
    scripts: [
      'src/**/*.{js,ts,tsx,jsx}',
      'gulp/**/*.{js,mjs}',
      'config/**/*.{js,mjs}',
      'scripts/**/*.{js,mjs}',
      '*.js',
      '*.mjs',
    ],
  },
}

export const lint = await loadUserConfig(baseLint, 'lint')
