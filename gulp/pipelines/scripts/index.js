import { build } from '#config/build.js'

import { scriptsEsbuild } from './esbuild.js'

export const scriptsPipeline = () => {
  switch (build.scripts.engine) {
    case 'esbuild':
    default:
      return scriptsEsbuild()
  }
}
