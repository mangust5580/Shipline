import {env} from '#gulp/utils/env.js'
import { logger } from '#gulp/utils/logger.js'
import {engines} from '#config/engines.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseScripts = {
  engine: engines.scripts,
  sourcemaps: env.isDev,
  minify: env.isProd,
  target: 'es2018',
  format: 'esm',
  splitting: false,
  outfile: 'main.js',
}

export const scripts = await loadUserConfig(baseScripts, 'scripts')

if (scripts.format === 'esm' && scripts.splitting === false) {
  logger.once(
    'scripts.esm.no-splitting',
    'scripts',
    'scripts.format="esm" with splitting:false requires <script type="module"> and compatible target browsers.',
    { devOnly: false },
  )
}
