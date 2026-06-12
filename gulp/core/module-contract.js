import { STAGES } from '#gulp/constants.js'

const isFn = v => typeof v === 'function'
const isStr = v => typeof v === 'string'

const ensure = (cond, message) => {
  if (!cond) throw new Error(message)
}

const fmt = (id, msg) => `[registry] ${id}: ${msg}`

const VALID_TASK_KEYS = new Set([STAGES.DEV, STAGES.BUILD, STAGES.PREVIEW])

const validateDependsOn = (id, deps, knownIds) => {
  if (deps == null) return
  ensure(Array.isArray(deps), fmt(id, 'dependsOn must be an array'))
  for (const d of deps) {
    ensure(isStr(d) && d.trim(), fmt(id, 'dependsOn items must be non-empty strings'))
    ensure(knownIds.has(d), fmt(id, `dependsOn references unknown module: "${d}"`))
  }
}

const validateWatch = (id, watch) => {
  if (watch == null) return
  ensure(isFn(watch), fmt(id, 'watch must be a function returning watch rules'))
}

const validateTasks = (id, kind, tasks) => {
  if (tasks == null) {
    if (kind === 'watch') return

    ensure(false, fmt(id, 'tasks is required for compile modules'))
  }

  ensure(
    tasks && typeof tasks === 'object' && !Array.isArray(tasks),
    fmt(id, 'tasks must be an object'),
  )

  const keys = Object.keys(tasks)
  for (const k of keys) {
    ensure(VALID_TASK_KEYS.has(k), fmt(id, `unknown tasks key "${k}" (allowed: dev|build|preview)`))
    ensure(isFn(tasks[k]), fmt(id, `tasks.${k} must be a function`))
  }

  if (kind !== 'watch') {
    ensure(keys.length > 0, fmt(id, 'tasks must define at least one stage task'))
  }
}

/**
 * Validates the registry shape and common pitfalls.
 * Throws on any inconsistency.
 */
export const validateModuleRegistry = modules => {
  ensure(Array.isArray(modules), '[registry] modules must be an array')

  const ids = new Set()

  for (const m of modules) {
    ensure(m && typeof m === 'object', '[registry] module must be an object')
    ensure(isStr(m.id) && m.id.trim(), '[registry] module.id must be a non-empty string')

    const id = m.id
    ensure(!ids.has(id), `[registry] duplicate module id: "${id}"`)
    ids.add(id)

    if (m.kind != null) {
      ensure(isStr(m.kind), fmt(id, 'kind must be a string'))
      ensure(
        m.kind === 'compile' || m.kind === 'watch',
        fmt(id, 'kind must be "compile" | "watch"'),
      )
    }

    if (m.order != null) {
      ensure(Number.isFinite(m.order), fmt(id, 'order must be a number'))
    }

    if (m.enabled != null) {
      ensure(isFn(m.enabled), fmt(id, 'enabled must be a function'))
    }

    validateTasks(id, m.kind || 'compile', m.tasks)
    validateWatch(id, m.watch)
  }

  for (const m of modules) {
    validateDependsOn(m.id, m.dependsOn, ids)
  }

  return modules
}

/**
 * Validates expanded watch rules (after calling module.watch()).
 */
export const validateWatchRules = rules => {
  ensure(Array.isArray(rules), '[registry] watch rules must be an array')
  for (const r of rules) {
    ensure(r && typeof r === 'object', '[registry] watch rule must be an object')
    ensure(isStr(r.key) && r.key.trim(), '[registry] watch rule "key" must be a non-empty string')

    const globsOk =
      isStr(r.globs) || (Array.isArray(r.globs) && r.globs.every(g => isStr(g) && g.trim()))
    ensure(globsOk, `[registry] watch rule "${r.key}": globs must be a string or string[]`)

    ensure(isFn(r.task), `[registry] watch rule "${r.key}": task must be a function`)
    ensure(
      r.action === 'reload' || r.action === 'task',
      `[registry] watch rule "${r.key}": action must be "reload" | "task"`,
    )
  }

  return rules
}
