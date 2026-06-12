export default {
  features: {
    svgSprite: {
      enabled: true,
    },
  },

  site: {
    siteUrl: 'https://mangust5580.github.io/Shipline',
    basePath: '/Shipline',
    name: 'Shipline',
    shortName: 'Shipline',
  },

  images: {
    // AVIF/WebP must be emitted in both dev and prod. A <picture> source that
    // points to a missing modern format will not fall back to <img> gracefully.
    dev: {
      formats: { webp: true, avif: true },
    },
    prod: {
      formats: { webp: true, avif: true },
    },
    rules: [],
  },

  engines: {
    templates: 'html',
    styles: 'tailwind',
  },

  templates: {
    engine: 'html',
    html: {
      mode: 'posthtml',
      posthtml: {
        enabled: true,
        includes: true,
      },
      expressions: {
        enabled: true,
      },
    },
  },

  styles: {
    engine: 'tailwind',
    postcss: {
      autoprefixer: true,
      pxtorem: {
        rootValue: 16,
        unitPrecision: 5,
        propList: [
          '--spacing-*',
          '--text-*',
          '--radius-*',
        ],
        mediaQuery: false,
        minPixelValue: 2,
        replace: true,
        selectorBlackList: [],
      },
    },
  },
}
