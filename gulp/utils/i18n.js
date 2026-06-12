import fs from 'node:fs'
import path from 'node:path'

import { features } from '#config/features.js'
import { i18n as i18nCfg } from '#config/i18n.js'
import { site } from '#config/site.js'

const normalizeLocale = l =>
  String(l || '')
    .trim()
    .toLowerCase()

const readJson = p => {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p)
  const raw = fs.readFileSync(abs, 'utf8')
  return JSON.parse(raw)
}

const getByPath = (obj, dotted) => {
  if (!obj || typeof obj !== 'object') return undefined
  if (!dotted) return undefined
  const parts = String(dotted).split('.').filter(Boolean)
  let cur = obj
  for (const k of parts) {
    if (!cur || typeof cur !== 'object' || !(k in cur)) return undefined
    cur = cur[k]
  }
  return cur
}

export const getI18nConfig = () => {
  const enabled = !!features.i18n?.enabled
  const locales = (i18nCfg.locales || []).map(normalizeLocale).filter(Boolean)
  const defaultLocale = normalizeLocale(i18nCfg.defaultLocale) || locales[0] || 'ru'

  return {
    enabled,
    locales: locales.length ? locales : ['ru'],
    defaultLocale,
    dictionariesDir: i18nCfg.dictionaries?.dir || 'src/data/locales',
    strictMissingKeys: i18nCfg.strictMissingKeys !== false,
    urlStrategy: 'prefix',
    siteUrl: site.siteUrl || '',
    basePath: site.basePath || '',
  }
}

export const loadDictionary = locale => {
  const cfg = getI18nConfig()
  if (!cfg.enabled) return {}
  const loc = normalizeLocale(locale) || cfg.defaultLocale
  const file = path.join(cfg.dictionariesDir, `${loc}.json`)

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
  if (!fs.existsSync(abs)) return {}
  return readJson(abs)
}

export const createTranslator = ({ locale, dict, strict, ctxLabel }) => {
  const loc = normalizeLocale(locale)
  const isStrict = strict ?? true

  return key => {
    const k = String(key || '')
    const v = getByPath(dict, k)
    if (v == null) {
      if (isStrict) {
        const where = ctxLabel ? ` (${ctxLabel})` : ''
        throw new Error(`[i18n] Missing translation key: "${k}" for locale "${loc}"${where}`)
      }
      return k
    }
    return typeof v === 'string' ? v : String(v)
  }
}

export const makeI18nContext = (locale, ctxLabel) => {
  const cfg = getI18nConfig()
  const loc = normalizeLocale(locale) || cfg.defaultLocale
  const dict = cfg.enabled ? loadDictionary(loc) : {}

  const t = createTranslator({
    locale: loc,
    dict,
    strict: cfg.enabled ? cfg.strictMissingKeys : false,
    ctxLabel,
  })

  return {
    i18n: dict,
    t,
    locale: loc,
    locales: cfg.locales,
    defaultLocale: cfg.defaultLocale,
    enabled: cfg.enabled,
  }
}

export const localePrefix = locale => `/${normalizeLocale(locale)}`

export const buildUrl = ({ locale, pathname = '' }) => {
  const cfg = getI18nConfig()
  const base = `${cfg.basePath || ''}${localePrefix(locale)}`
  const clean = String(pathname || '').replace(/^\//, '')
  return `${base}/${clean}`.replace(/\/+$/, '/').replace(/\/\/+/, '/')
}
