import { env } from '#gulp/utils/env.js'
import { normalizeStage } from '#gulp/core/stage.js'
import { getConfig } from '#gulp/core/config.js'

export const createContext = ({ stage }) => {
  const s = normalizeStage(stage)
  const config = getConfig({ stage: s })

  return {
    stage: s,
    env,
    profile: Boolean(process.env.PROFILE) && process.env.PROFILE !== '0',
    config,
    engines: config.engines,
    features: config.features,
    paths: config.paths,
    project: config.project,
    site: config.site,
    plugins: config.plugins,
  }
}
