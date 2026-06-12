import { env } from '#gulp/utils/env.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseConfig = {
  engine: 'scss',
  sourcemaps: env.isDev,
  sass: {
    loadPaths: ['src/styles'],
  },
  postcss: {
    autoprefixer: true,
    cssnano: env.isProd,
    pxtorem: {
      rootValue: 16,
      propList: [
        'font',
        'font-size',
        'line-height',
        'letter-spacing',
        'margin*',
        'padding*',
        'gap',
        'row-gap',
        'column-gap',
        'width',
        'min-width',
        'max-width',
        'height',
        'min-height',
        'max-height',
        'inline-size',
        'min-inline-size',
        'max-inline-size',
        'block-size',
        'min-block-size',
        'max-block-size',
        'top',
        'right',
        'bottom',
        'left',
        'inset*',
        'border-radius'
      ],
      mediaQuery: false,
      minPixelValue: 2,
      replace: true,
      selectorBlackList: [],
    },
  },
}

export const styles = await loadUserConfig(baseConfig, 'styles')
