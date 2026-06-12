import { STAGES } from '#gulp/constants.js'

export { STAGES }

export const normalizeStage = stage => {
  if (!stage) return STAGES.DEV
  const values = new Set(Object.values(STAGES))
  return values.has(stage) ? stage : STAGES.DEV
}

export const isDevStage = stage => normalizeStage(stage) === STAGES.DEV

export const isBuildStage = stage => {
  const s = normalizeStage(stage)
  return s === STAGES.BUILD || s === STAGES.BUILD_FAST
}

export const isPreviewStage = stage => normalizeStage(stage) === STAGES.PREVIEW
