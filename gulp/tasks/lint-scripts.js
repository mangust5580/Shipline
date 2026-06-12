import path from 'node:path'
import { spawn } from 'node:child_process'

import { env } from '#gulp/utils/env.js'
import { lint } from '#config/lint.js'
import { logger } from '#gulp/utils/logger.js'

export const lintScriptsTask = cb => {
  if (!lint.enabled?.scripts) {
    cb()
    return
  }

  const eslintCli = path.resolve('node_modules', 'eslint', 'bin', 'eslint.js')

  const targets = lint.globs?.scripts?.length ? lint.globs.scripts : ['.']
  const args = [eslintCli, '--no-error-on-unmatched-pattern', ...targets]

  const proc = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: env.isProd ? 'production' : 'development',
    },
  })

  proc.on('error', err => cb(err))

  proc.on('close', code => {
    if (code !== 0) {
      if (lint.strict?.scripts !== false) {
        cb(new Error(`ESLint failed with code ${code}`))
        return
      }

      logger.warn('lint:scripts', `ESLint failed (code ${code}), but build continues`)
      cb()
      return
    }

    cb()
  })
}
