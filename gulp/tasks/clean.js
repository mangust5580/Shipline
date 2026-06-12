import { deleteAsync } from 'del'
import { paths } from '#config/paths.js'

export const clean = async () => {
  await deleteAsync([paths.out], { force: true })
}

export const cleanAll = async () => {
  await deleteAsync([paths.dist, paths.public], { force: true })
}
