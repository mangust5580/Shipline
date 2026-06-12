import { env } from '#gulp/utils/env.js'

export const getLintTask = () => (env.isProd ? null : null)

export const getValidateStructureTask = () => done => done()

export const getValidateAssetsTask = () => done => done()
