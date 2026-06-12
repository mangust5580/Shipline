import {getCliValue} from '#gulp/utils/cli.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseFeatures = {
  notifications: {
    enabled: false,
  },

  i18n: {
    enabled: false,
  },

  seo: {
    enabled: true,
    sitemap: true,
    robots: true,
    requireSiteUrl: {
      local: false,
      ci: true,
    },
  },

  versioning: {
    enabled: true,
    strategy: 'hash',
    manifest: true,
  },

  favicons: {
    enabled: true,
    requireSourceInBuild: true,
  },

  svgSprite: {
    enabled: false,
    policy: {
      onDisabledFilesDev: 'warn',
      onDisabledFilesBuild: 'error',
    },
  },

  static: {
    enabled: true,
    policy: {
      onDisabledFilesDev: 'warn',
      onDisabledFilesBuild: 'error',
    },
  },

  media: {
    audio: {enabled: false, devMode: 'copy', buildMode: 'transcode'},
    video: {enabled: false, devMode: 'copy', buildMode: 'transcode'},
    policy: {
      onDisabledFilesDev: 'warn',
      onDisabledFilesBuild: 'error',
    },
  },

  quality: {
    validateStructure: {
      enabled: true,
      dev: 'warn',
      build: 'fail',
      preview: 'fail',
      buildFast: 'fail',
      rules: {
        requirePages: true,
        requireScriptsEntry: true,
        requireStylesEntry: true,
        requireFaviconsSource: true,
      },
    },
    validateStructureOnDevStart: true,
    validateStructureOnBuild: true,
    validateStructureOnPreview: true,
    validateAssets: {
      enabled: true,
      dev: 'warn',
      build: 'fail',
      preview: 'fail',
      buildFast: 'fail',
      linksMode: 'off',
      allowNoExt: true,
      preferIndex: true,
      ignore: [],
    },
    validateOnBuild: false,
    budgetOnBuild: false,
  },

  reports: {
    bundleSizes: {
      enabled: true,
      build: true,
      buildFast: false,
      preview: false,
      include: ['**/*.*'],
      exclude: ['**/*.map'],
      top: 20,
      writeJson: true,
      jsonFile: 'reports/bundle-sizes.json',
    },
  },
}

const profile = String(getCliValue('profile') ?? process.env.GULP_LONRAV_PROFILE ?? '').trim()

const profiles = {
  full: {},

  basic: {
    favicons: {enabled: false},
    svgSprite: {enabled: false},
    static: {enabled: false},
    media: {
      audio: {enabled: false},
      video: {enabled: false},
    },
    versioning: {enabled: false},
    reports: {bundleSizes: {enabled: false}},
    quality: {
      validateStructure: {
        rules: {
          requireFaviconsSource: false,
        },
      },
    },
  },

  'no-favicons': {
    favicons: {enabled: false},
    quality: {
      validateStructure: {
        rules: {
          requireFaviconsSource: false,
        },
      },
    },
  },

  'no-sprite': {
    svgSprite: {enabled: false},
  },
}

const deepMerge = (base, extra) => {
  if (!extra || typeof extra !== 'object') return base
  const out = Array.isArray(base) ? [...base] : {...base}

  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base?.[k] && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v)
    } else {
      out[k] = v
    }
  }

  return out
}

const baseFeaturesResolved = profiles[profile] ? deepMerge(baseFeatures, profiles[profile]) : baseFeatures

export const features = await loadUserConfig(baseFeaturesResolved, 'features')
