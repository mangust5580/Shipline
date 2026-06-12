/**
 * Returns value for a CLI option.
 * Supports:
 *   --name=value
 *   --name value
 *
 * @param {string} name
 * @returns {string|undefined}
 */
export function getCliValue(name) {
  const key = `--${name}`
  const argv = process.argv || []

  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i])
    if (a === key) {
      const next = argv[i + 1]
      if (next == null) return undefined
      const v = String(next)
      if (v.startsWith('--')) return undefined
      return v
    }

    if (a.startsWith(`${key}=`)) {
      return a.slice(key.length + 1)
    }
  }

  return undefined
}
