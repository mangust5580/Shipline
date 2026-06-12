import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseSvg = {
  outSubdir: 'images',
  optimize: {
    dev: false,
    prod: true,
    svgoConfig: {
      multipass: true,
      plugins: [
        {name: 'preset-default'},
        {name: 'removeViewBox', active: false},
        {name: 'cleanupIds', active: false},
      ],
    },
  },

  sprite: {
    enabled: true,
    outSubdir: 'icons',
    filename: 'sprite.svg',
    symbolIdPrefix: 'icon-',
    optimize: {
      dev: true,
      prod: true,
      svgoConfig: {
        multipass: true,
        plugins: [
          {name: 'preset-default'},
          {name: 'removeViewBox', active: false},
          {name: 'cleanupIds', active: false},
        ],
      },
    },
  },
}

export const svg = await loadUserConfig(baseSvg, 'svg')
