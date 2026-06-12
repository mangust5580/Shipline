import { plugins } from '#config/plugins.js'
import { env } from '#gulp/utils/env.js'
import { notifyError } from '#gulp/utils/notify.js'
import { logger } from '#gulp/utils/logger.js'

/**
 * Keeps watch/server alive in development, but lets builds fail in production.
 *
 * Usage:
 *   .pipe(withPlumber('task:name'))
 */
export const withPlumber = (taskName, { enabled = env.isDev } = {}) =>
  plugins.gulpIf(
    enabled,
    plugins.plumber({
      errorHandler(err) {
        const message = err?.message || String(err)
        logger.error(taskName, message)

        notifyError({ title: taskName, message })

        this.emit('end')
      },
    }),
  )
