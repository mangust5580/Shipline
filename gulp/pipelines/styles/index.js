import { styles } from '#config/styles.js'

export const stylesPipeline = async () => {
  switch (styles.engine) {
    case 'css': {
      const { stylesCss } = await import('#gulp/pipelines/styles/css.js')
      return stylesCss()
    }
    case 'tailwind': {
      const { stylesTailwind } = await import('#gulp/pipelines/styles/tailwind.js')
      return stylesTailwind()
    }
    case 'scss':
    default: {
      const { stylesScss } = await import('#gulp/pipelines/styles/scss.js')
      return stylesScss()
    }
  }
}
