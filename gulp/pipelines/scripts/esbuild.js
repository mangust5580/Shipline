import path from 'node:path'
import { build as esbuild } from 'esbuild'

import { paths } from '#config/paths.js'
import { scripts } from '#config/scripts.js'
import { plugins } from '#config/plugins.js'
import { env } from '#gulp/utils/env.js'

export const scriptsEsbuild = async () => {
  const outdir = path.join(paths.out, paths.scripts.dest)
  const splitting = Boolean(scripts.splitting)

  await esbuild({
    entryPoints: [paths.scripts.entry],
    bundle: true,
    outdir,
    entryNames: path.parse(scripts.outfile).name,
    sourcemap: scripts.sourcemaps,
    minify: scripts.minify,
    target: scripts.target,
    // esbuild requires ESM output when code splitting is enabled.
    format: splitting ? 'esm' : scripts.format,
    platform: 'browser',
    splitting,
    logLevel: 'info',
  })
  if (env.isDev) plugins.browserSync.reload()
}
