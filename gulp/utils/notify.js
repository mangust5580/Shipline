import { features } from '#config/features.js'

let cachedNotify = null

async function getNotify() {
  if (!features.notifications?.enabled) return null
  if (cachedNotify) return cachedNotify

  const mod = await import('gulp-notify')
  cachedNotify = mod.default ?? mod
  return cachedNotify
}

export async function notifyError({ title, message }) {
  try {
    const notify = await getNotify()
    if (!notify) return

    notify.onError({ title, message })({})
  } catch {
    return undefined
  }
}
