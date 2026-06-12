import path from 'node:path'
import fs from 'node:fs/promises'

import { globSafe, toPosix } from '#gulp/utils/glob.js'
import { logger } from '#gulp/utils/logger.js'

import { paths } from '#config/paths.js'
import { plugins } from '#config/plugins.js'
import { images } from '#config/images.js'
import { env } from '#gulp/utils/env.js'
import { lazyDefault } from '#gulp/utils/lazy.js'
import { notifyError } from '#gulp/utils/notify.js'
import {
  readMediaIndex,
  writeMediaIndex,
  stableHash,
  fileSigFromStat,
  mediaCacheDirFor,
  mediaBaseNameFor,
  ensureFileExists,
} from '#gulp/utils/cache.js'

let sharp

const outDir = path.join(paths.out, 'images')

async function asyncPool(limit, items, iteratorFn) {
  const ret = []
  const executing = new Set()

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item))
    ret.push(p)
    executing.add(p)

    const clean = () => executing.delete(p)
    p.then(clean).catch(clean)

    if (executing.size >= limit) await Promise.race(executing)
  }

  return Promise.all(ret)
}

async function ensureDir(absDir) {
  await fs.mkdir(absDir, { recursive: true })
}

async function statSafe(abs) {
  try {
    return await fs.stat(abs)
  } catch {
    return null
  }
}

function makeExtSets(cfg) {
  const raster = new Set((cfg.extensions?.raster ?? []).map(e => e.toLowerCase()))
  const vector = new Set((cfg.extensions?.vector ?? []).map(e => e.toLowerCase()))
  return { raster, vector }
}

function normalizeGlobPattern(pattern) {
  return toPosix(String(pattern || '')).replace(/^\.?\//, '')
}

function matchesPattern(input, pattern) {
  const value = toPosix(input)
  const p = normalizeGlobPattern(pattern)
  if (!p) return false

  if (p.endsWith('/**')) {
    const prefix = p.slice(0, -3)
    return value === prefix || value.startsWith(`${prefix}/`)
  }

  if (p.includes('*')) {
    const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
    return new RegExp(`^${escaped}$`).test(value)
  }

  return value === p
}

function matchesAny(input, patterns) {
  if (!patterns?.length) return false
  return patterns.some(pattern => matchesPattern(input, pattern))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(base, extra) {
  if (!isPlainObject(extra)) return base

  const out = isPlainObject(base) ? { ...base } : {}

  for (const [key, value] of Object.entries(extra)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value)
    } else {
      out[key] = value
    }
  }

  return out
}

function toPatternList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function getRulePatterns(rule) {
  if (!isPlainObject(rule)) return []
  return toPatternList(rule.match ?? rule.matches ?? rule.pattern)
}

function collectMatchedRules(relPosix, rules) {
  if (!Array.isArray(rules) || !rules.length) return []

  return rules.filter(rule => {
    const patterns = getRulePatterns(rule)
    if (!patterns.length) return false
    return matchesAny(relPosix, patterns)
  })
}

function applyRuleOverridesToCfg(baseCfg, matchedRules) {
  let out = baseCfg

  for (const rule of matchedRules) {
    if (!isPlainObject(rule)) continue

    const patch = {}
    if (isPlainObject(rule.formats)) patch.formats = rule.formats
    if (isPlainObject(rule.retina)) patch.retina = rule.retina
    if (isPlainObject(rule.quality)) patch.quality = rule.quality
    if (typeof rule.mode === 'string') patch.mode = rule.mode

    if (Object.keys(patch).length) {
      out = deepMerge(out, patch)
    }
  }

  return out
}

function resolveOptimizeOverride(matchedRules) {
  let value

  for (const rule of matchedRules) {
    if (!isPlainObject(rule)) continue
    if (typeof rule.optimize === 'boolean') value = rule.optimize
  }

  return value
}

function resolveResponsiveConfig(globalResponsive, matchedRules) {
  let resolved = isPlainObject(globalResponsive) ? deepMerge({}, globalResponsive) : {}

  for (const rule of matchedRules) {
    if (!isPlainObject(rule)) continue
    if (isPlainObject(rule.responsive)) {
      resolved = deepMerge(resolved, rule.responsive)
    }
  }

  return resolved
}

function parseResponsiveOptions(responsiveRaw) {
  const fallbackWidths = [320, 480, 640, 768, 1024, 1280]
  const raw = isPlainObject(responsiveRaw) ? responsiveRaw : {}
  const autoWidths = raw.widths === 'auto'

  const enabled = raw.enabled !== false
  const widths =
    autoWidths
      ? 'auto'
      : (Array.isArray(raw.widths) && raw.widths.length
        ? raw.widths.filter(v => Number.isFinite(v) && v > 0)
        : fallbackWidths)
  const keepOriginal = raw.keepOriginal !== false
  const minSourceWidth = Number.isFinite(Number(raw.minSourceWidth))
    ? Number(raw.minSourceWidth)
    : 640

  return { enabled, widths, keepOriginal, minSourceWidth, autoWidths, fallbackWidths }
}

function shouldSkipOptimize({ relPosix, excludeOptimize, optimizeOverride }) {
  if (optimizeOverride === false) return true
  if (optimizeOverride === true) return false
  return shouldSkip(relPosix, excludeOptimize)
}

function shouldSkip(relPosix, patterns) {
  return matchesAny(relPosix, patterns)
}

function isRetina2x(filePath, suffix) {
  const base = path.basename(filePath)
  return base.includes(`${suffix}.`)
}

function stripRetinaSuffix(fileName, suffix) {
  return fileName.replace(suffix, '')
}

async function copyFilePreserveDirs(fileAbs, relFromBase) {
  const destAbs = path.join(outDir, relFromBase)
  await ensureDir(path.dirname(destAbs))
  await fs.copyFile(fileAbs, destAbs)
}

function requiredOutputsStandard({ baseName, ext, cfg, abs }) {
  const out = []
  out.push(`${baseName}${ext}`)

  const formats = cfg.formats || {}
  const genWebp = Boolean(formats.webp)
  const genAvif = Boolean(formats.avif)

  if (ext !== '.gif') {
    if (genWebp && ext !== '.webp') out.push(`${baseName}.webp`)
    if (genAvif && ext !== '.avif') out.push(`${baseName}.avif`)
  }

  const retina = cfg.retina || {}
  const retinaEnabled = Boolean(retina.enabled)
  const retinaSuffix = retina.suffix ?? '@2x'
  const gen1xFrom2x = Boolean(retina.generate1xFrom2x)

  if (retinaEnabled && gen1xFrom2x && abs && isRetina2x(abs, retinaSuffix) && ext !== '.gif') {
    const oneXBase = stripRetinaSuffix(baseName, retinaSuffix)
    if (ext === '.webp') out.push(`${oneXBase}.webp`)
    else if (ext === '.avif') out.push(`${oneXBase}.avif`)
    else out.push(`${oneXBase}${ext}`)

    if (genWebp && ext !== '.webp') out.push(`${oneXBase}.webp`)
    if (genAvif && ext !== '.avif') out.push(`${oneXBase}.avif`)
  }

  return Array.from(new Set(out))
}

function requiredOutputsResponsive({ baseName, ext, cfg, abs, widths, keepOriginal, retinaSuffix }) {
  const out = new Set()

  if (keepOriginal) {
    for (const fileName of requiredOutputsStandard({ baseName, ext, cfg, abs })) out.add(fileName)
  }

  const formats = cfg.formats || {}
  const genWebp = Boolean(formats.webp)
  const genAvif = Boolean(formats.avif)

  const normalBaseName = isRetina2x(`${baseName}${ext}`, retinaSuffix)
    ? stripRetinaSuffix(baseName, retinaSuffix)
    : baseName

  for (const width of widths) {
    const sizedBase = `${normalBaseName}-${width}`
    out.add(`${sizedBase}${ext}`)

    if (ext !== '.gif') {
      if (genWebp && ext !== '.webp') out.add(`${sizedBase}.webp`)
      if (genAvif && ext !== '.avif') out.add(`${sizedBase}.avif`)
    }
  }

  return Array.from(out)
}

async function hasAllCached({ cacheDir, cached, sig, paramsHash, req }) {
  if (!cached) return false
  if (cached.sig !== sig || cached.paramsHash !== paramsHash) return false
  if (!req.length) return false
  if (!cacheDir) return false

  for (const fileName of req) {
    const ok = await ensureFileExists(path.join(cacheDir, fileName))
    if (!ok) return false
  }

  return true
}

function isResponsiveDerivedFile(absPath) {
  const base = path.basename(absPath)
  const dot = base.lastIndexOf('.')
  const name = dot === -1 ? base : base.slice(0, dot)
  return /-\d{2,4}/.test(name)
}

function isOgPath(relPosix) {
  const p = toPosix(relPosix)
  return p === 'og' || p.startsWith('og/')
}

function isRasterForResponsive(ext) {
  return ext === '.png' || ext === '.jpg' || ext === '.jpeg'
}

function filterWidths(widths, sourceWidth) {
  const w = Number(sourceWidth || 0)
  return widths.filter(x => Number.isFinite(x) && x > 0 && (w ? x <= w : true))
}

async function readWidthWithSharp(fileAbs) {
  const img = sharp(fileAbs, { failOn: 'none' })
  const meta = await img.metadata()
  return Number(meta?.width || 0)
}

async function collectResponsiveWidthsFromMarkup() {
  const files = await globSafe(toPosix(path.join(paths.src, '**/*.html')), { onlyFiles: true })
  const byBase = new Map()
  const responsiveRefRe = /images\/([^"'\s,]+?)-(\d{2,4})\.(?:png|jpe?g|webp|avif)\s+\2w/g

  for (const file of files) {
    const html = await fs.readFile(file, 'utf8')
    for (const match of html.matchAll(responsiveRefRe)) {
      const relBase = toPosix(match[1])
      const width = Number(match[2])
      if (!Number.isFinite(width) || width <= 0) continue

      const widths = byBase.get(relBase) ?? new Set()
      widths.add(width)
      byBase.set(relBase, widths)
    }
  }

  return byBase
}

async function processRasterDevToDir({ fileAbs, destDir, baseName, ext, cfg, responsive, metaWidth }) {
  await ensureDir(destDir)

  const formats = cfg.formats || {}
  const genWebp = Boolean(formats.webp)
  const genAvif = Boolean(formats.avif)

  const retina = cfg.retina || {}
  const retinaEnabled = Boolean(retina.enabled)
  const retinaSuffix = retina.suffix ?? '@2x'
  const retinaScale = Number(retina.scale ?? 2)
  const gen1xFrom2x = Boolean(retina.generate1xFrom2x)

  if (ext === '.gif') {
    await fs.copyFile(fileAbs, path.join(destDir, `${baseName}${ext}`))
    return
  }

  const base = sharp(fileAbs, { failOn: 'none' })
  const meta = await base.metadata()

  const writeDerived = async (targetBaseName, resizeScale = null, resizeWidth = null) => {
    const img = base.clone()

    if (resizeWidth && meta.width && meta.height) {
      img.resize(resizeWidth, null, { fit: 'inside', withoutEnlargement: true })
    } else if (resizeScale && meta.width && meta.height) {
      const outW = Math.max(1, Math.round(meta.width / resizeScale))
      const outH = Math.max(1, Math.round(meta.height / resizeScale))
      img.resize(outW, outH, { fit: 'inside' })
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      await img.clone().jpeg({ quality: 90, mozjpeg: false, progressive: true }).toFile(
        path.join(destDir, `${targetBaseName}${ext}`),
      )
    } else if (ext === '.png') {
      await img.clone().png({ compressionLevel: 6 }).toFile(path.join(destDir, `${targetBaseName}${ext}`))
    } else if (ext === '.webp') {
      await img.clone().webp({ quality: 90 }).toFile(path.join(destDir, `${targetBaseName}.webp`))
    } else if (ext === '.avif') {
      await img.clone().avif({ quality: 60 }).toFile(path.join(destDir, `${targetBaseName}.avif`))
    } else {
      await fs.copyFile(fileAbs, path.join(destDir, `${targetBaseName}${ext}`))
    }

    if (genWebp && ext !== '.webp') {
      await img.clone().webp({ quality: 90 }).toFile(path.join(destDir, `${targetBaseName}.webp`))
    }
    if (genAvif && ext !== '.avif') {
      await img.clone().avif({ quality: 60 }).toFile(path.join(destDir, `${targetBaseName}.avif`))
    }
  }

  if (responsive?.enabled) {
    const normalBaseName = isRetina2x(fileAbs, retinaSuffix) ? stripRetinaSuffix(baseName, retinaSuffix) : baseName
    const widths = filterWidths(responsive.widths, metaWidth || meta.width)

    if (responsive.keepOriginal) {
      await writeDerived(baseName)

      if (normalBaseName !== baseName && retinaEnabled && gen1xFrom2x) {
        await writeDerived(
          normalBaseName,
          Number.isFinite(retinaScale) && retinaScale > 0 ? retinaScale : 2,
        )
      }
    }

    for (const w of widths) {
      await writeDerived(`${normalBaseName}-${w}`, null, w)
    }

    return
  }

  await writeDerived(baseName)

  if (retinaEnabled && gen1xFrom2x && isRetina2x(fileAbs, retinaSuffix)) {
    const oneXBase = stripRetinaSuffix(baseName, retinaSuffix)
    await writeDerived(oneXBase, Number.isFinite(retinaScale) && retinaScale > 0 ? retinaScale : 2)
  }
}

async function processRasterToDir({ fileAbs, destDir, baseName, ext, cfg, responsive, metaWidth }) {
  await ensureDir(destDir)

  const base = sharp(fileAbs, { failOn: 'none' })
  const meta = await base.metadata()

  const q = cfg.quality || {}
  const jpegQ = q.jpeg || {}
  const pngQ = q.png || {}
  const webpQ = q.webp || {}
  const avifQ = q.avif || {}

  const formats = cfg.formats || {}
  const genWebp = Boolean(formats.webp)
  const genAvif = Boolean(formats.avif)

  const retina = cfg.retina || {}
  const retinaEnabled = Boolean(retina.enabled)
  const retinaSuffix = retina.suffix ?? '@2x'
  const retinaScale = Number(retina.scale ?? 2)
  const gen1xFrom2x = Boolean(retina.generate1xFrom2x)

  const writeOptimized = async (targetBaseName, resizeScale = null, resizeWidth = null) => {
    const source = base.clone()

    if (resizeWidth && meta.width && meta.height) {
      source.resize(resizeWidth, null, { fit: 'inside', withoutEnlargement: true })
    } else if (resizeScale && meta.width && meta.height) {
      const outW = Math.max(1, Math.round(meta.width / resizeScale))
      const outH = Math.max(1, Math.round(meta.height / resizeScale))
      source.resize(outW, outH, { fit: 'inside' })
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      await source
        .clone()
        .jpeg({
          quality: jpegQ.quality ?? 78,
          mozjpeg: jpegQ.mozjpeg ?? true,
          progressive: jpegQ.progressive ?? true,
        })
        .toFile(path.join(destDir, `${targetBaseName}${ext}`))
    } else if (ext === '.png') {
      await source
        .clone()
        .png({
          compressionLevel: pngQ.compressionLevel ?? 9,
          palette: pngQ.palette ?? true,
        })
        .toFile(path.join(destDir, `${targetBaseName}${ext}`))
    } else if (ext === '.gif') {
      await fs.copyFile(fileAbs, path.join(destDir, `${targetBaseName}${ext}`))
    } else if (ext === '.webp') {
      await source
        .clone()
        .webp({ quality: webpQ.quality ?? 78 })
        .toFile(path.join(destDir, `${targetBaseName}.webp`))
    } else if (ext === '.avif') {
      await source
        .clone()
        .avif({ quality: avifQ.quality ?? 50 })
        .toFile(path.join(destDir, `${targetBaseName}.avif`))
    } else {
      await fs.copyFile(fileAbs, path.join(destDir, `${targetBaseName}${ext}`))
    }

    if (genWebp && ext !== '.webp' && ext !== '.gif') {
      await source
        .clone()
        .webp({ quality: webpQ.quality ?? 78 })
        .toFile(path.join(destDir, `${targetBaseName}.webp`))
    }

    if (genAvif && ext !== '.avif' && ext !== '.gif') {
      await source
        .clone()
        .avif({ quality: avifQ.quality ?? 50 })
        .toFile(path.join(destDir, `${targetBaseName}.avif`))
    }
  }

  if (responsive?.enabled) {
    const normalBaseName = isRetina2x(fileAbs, retinaSuffix) ? stripRetinaSuffix(baseName, retinaSuffix) : baseName
    const widths = filterWidths(responsive.widths, metaWidth || meta.width)

    if (responsive.keepOriginal) {
      await writeOptimized(baseName)

      if (normalBaseName !== baseName && retinaEnabled && gen1xFrom2x) {
        await writeOptimized(
          normalBaseName,
          Number.isFinite(retinaScale) && retinaScale > 0 ? retinaScale : 2,
        )
      }
    }

    for (const w of widths) {
      await writeOptimized(`${normalBaseName}-${w}`, null, w)
    }

    return
  }

  await writeOptimized(baseName)

  if (retinaEnabled && gen1xFrom2x && isRetina2x(fileAbs, retinaSuffix)) {
    const oneXBase = stripRetinaSuffix(baseName, retinaSuffix)
    await writeOptimized(oneXBase, Number.isFinite(retinaScale) && retinaScale > 0 ? retinaScale : 2)
  }
}

export const imagesTask = async () => {
  try {
    await ensureDir(outDir)

    const base = paths.assets.imagesBase
    const files = await globSafe(toPosix(paths.assets.images), { onlyFiles: true })

    const cfg = env.isProd ? images.prod : images.dev
    if (!files.length) {
      if (cfg.allowEmpty) return
      return
    }

    const { raster: RASTER_EXTS } = makeExtSets(images)
    const excludeOptimize = images.exclude?.optimize ?? []
    const excludeFormats = images.exclude?.generateFormats ?? []
    const responsiveCfgRaw = images.responsive || {}
    const rules = Array.isArray(images.rules) ? images.rules : []
    const baseResponsive = parseResponsiveOptions(responsiveCfgRaw)

    const index = await readMediaIndex()
    index.images ??= {}

    const devMode = cfg.mode ?? 'copy'
    const needDerivedByMode = devMode === 'derived'
    const needDerivedByCfg =
      Boolean(cfg.formats?.webp) ||
      Boolean(cfg.formats?.avif) ||
      (Boolean(cfg.retina?.enabled) && Boolean(cfg.retina?.generate1xFrom2x))
    const needDerived = !env.isProd && needDerivedByMode && needDerivedByCfg

    const hasRuleResponsiveOverrides = rules.some(rule => isPlainObject(rule?.responsive))
    const needSharpForResponsive = baseResponsive.enabled || hasRuleResponsiveOverrides
    const needSharp = env.isProd || needDerived || needSharpForResponsive
    const markupResponsiveWidths = await collectResponsiveWidthsFromMarkup()

    if (needSharp) {
      sharp = await lazyDefault('sharp')
      if (!sharp) throw new Error('[images] Failed to load sharp.')
    }

    const concurrency = env.isProd ? (cfg.concurrency ?? 6) : (cfg.concurrency ?? 16)

    await asyncPool(concurrency, files, async abs => {
      const rel = path.relative(base, abs)
      const relPosix = toPosix(rel)
      const ext = path.extname(abs).toLowerCase()
      if (!RASTER_EXTS.has(ext)) return

      const matchedRules = collectMatchedRules(relPosix, rules)
      const optimizeOverride = resolveOptimizeOverride(matchedRules)
      const responsiveResolved = resolveResponsiveConfig(responsiveCfgRaw, matchedRules)
      const responsiveOptions = parseResponsiveOptions(responsiveResolved)

      if (isOgPath(relPosix)) {
        const outRelPosix = relPosix
        let localCfg = shouldSkip(relPosix, excludeFormats)
          ? { ...cfg, formats: { ...cfg.formats, webp: false, avif: false } }
          : cfg
        localCfg = applyRuleOverridesToCfg(localCfg, matchedRules)

        if (!env.isProd && !needDerived) {
          await copyFilePreserveDirs(abs, outRelPosix)
          return
        }

        if (shouldSkipOptimize({ relPosix, excludeOptimize, optimizeOverride })) {
          await copyFilePreserveDirs(abs, outRelPosix)
          return
        }

        const inSt = await statSafe(abs)
        if (!inSt) return
        const sig = fileSigFromStat(inSt)

        const relNoExtPosix = outRelPosix.replace(path.extname(outRelPosix), '')
        const baseName = mediaBaseNameFor(relNoExtPosix)

        const cacheDir = path.join(mediaCacheDirFor('images', relNoExtPosix), `${baseName}__${ext.slice(1)}`)
        const outFileDir = path.join(outDir, path.dirname(outRelPosix))
        await ensureDir(outFileDir)

        const req = requiredOutputsStandard({ baseName, ext, cfg: localCfg, abs })

        const paramsHash = stableHash({ env: env.isProd ? 'prod' : 'dev', cfg: localCfg, responsive: null })
        const cached = index.images[relPosix]

        const ok = await hasAllCached({ cacheDir, cached, sig, paramsHash, req })
        if (!ok) {
          if (env.isProd) {
            await processRasterToDir({ fileAbs: abs, destDir: cacheDir, baseName, ext, cfg: localCfg, responsive: null })
          } else {
            await processRasterDevToDir({
              fileAbs: abs,
              destDir: cacheDir,
              baseName,
              ext,
              cfg: localCfg,
              responsive: null,
            })
          }
          index.images[relPosix] = { sig, paramsHash }
        }

        for (const fileName of req) {
          await fs.copyFile(path.join(cacheDir, fileName), path.join(outFileDir, fileName))
        }

        return
      }

      let localCfg = shouldSkip(relPosix, excludeFormats)
        ? { ...cfg, formats: { ...cfg.formats, webp: false, avif: false } }
        : cfg
      localCfg = applyRuleOverridesToCfg(localCfg, matchedRules)

      const inSt = await statSafe(abs)
      if (!inSt) return
      const sig = fileSigFromStat(inSt)

      const relNoExtPosix = relPosix.replace(path.extname(relPosix), '')
      const baseName = mediaBaseNameFor(relNoExtPosix)

      const retinaSuffix = (localCfg.retina?.suffix ?? '@2x')
      const canResponsiveByName = !isResponsiveDerivedFile(abs)
      const canResponsiveByFormat = responsiveOptions.enabled && isRasterForResponsive(ext)
      const responsiveCandidate = canResponsiveByFormat && canResponsiveByName

      let metaWidth = 0
      let responsiveOk = false
      let responsiveWidthsFinal = []

      if (responsiveCandidate) {
        metaWidth = await readWidthWithSharp(abs)
        responsiveOk = Number(metaWidth) >= Number(responsiveOptions.minSourceWidth)
        if (responsiveOk) {
          const normalBaseName = isRetina2x(abs, retinaSuffix) ? stripRetinaSuffix(baseName, retinaSuffix) : baseName
          const relDir = toPosix(path.dirname(relNoExtPosix))
          const relBase = relDir && relDir !== '.' ? `${relDir}/${normalBaseName}` : normalBaseName
          const markupWidths = markupResponsiveWidths.get(relBase)
          const widthsSource = responsiveOptions.autoWidths
            ? (markupWidths?.size ? Array.from(markupWidths).sort((a, b) => a - b) : responsiveOptions.fallbackWidths)
            : responsiveOptions.widths
          responsiveWidthsFinal = filterWidths(widthsSource, metaWidth)
        }
      }

      const responsivePlan = responsiveOk
        ? {
          enabled: true,
          widths: responsiveWidthsFinal,
          keepOriginal: responsiveOptions.keepOriginal,
        }
        : null

      if (!env.isProd && !needDerived && !responsivePlan) {
        await copyFilePreserveDirs(abs, relPosix)
        return
      }

      if (shouldSkipOptimize({ relPosix, excludeOptimize, optimizeOverride })) {
        await copyFilePreserveDirs(abs, relPosix)
        return
      }

      const cacheDir = path.join(
        mediaCacheDirFor('images', relNoExtPosix),
        `${baseName}__${ext.slice(1)}${responsivePlan ? '__responsive' : ''}`,
      )
      const outFileDir = path.join(outDir, path.dirname(relPosix))
      await ensureDir(outFileDir)

      const req = responsivePlan
        ? requiredOutputsResponsive({
          baseName,
          ext,
          cfg: localCfg,
          abs,
          widths: responsivePlan.widths,
          keepOriginal: responsivePlan.keepOriginal,
          retinaSuffix,
        })
        : requiredOutputsStandard({ baseName, ext, cfg: localCfg, abs })

      const paramsHash = stableHash({
        env: env.isProd ? 'prod' : 'dev',
        cfg: localCfg,
        responsive: responsivePlan
          ? {
            widths: responsivePlan.widths,
            keepOriginal: responsivePlan.keepOriginal,
            minSourceWidth: responsiveOptions.minSourceWidth,
          }
          : null,
      })

      const cached = index.images[relPosix]
      const ok = await hasAllCached({ cacheDir, cached, sig, paramsHash, req })

      if (!ok) {
        if (env.isProd) {
          await processRasterToDir({
            fileAbs: abs,
            destDir: cacheDir,
            baseName,
            ext,
            cfg: localCfg,
            responsive: responsivePlan,
            metaWidth,
          })
        } else {
          await processRasterDevToDir({
            fileAbs: abs,
            destDir: cacheDir,
            baseName,
            ext,
            cfg: localCfg,
            responsive: responsivePlan,
            metaWidth,
          })
        }
        index.images[relPosix] = { sig, paramsHash }
      }

      for (const fileName of req) {
        await fs.copyFile(path.join(cacheDir, fileName), path.join(outFileDir, fileName))
      }
    })

    await writeMediaIndex(index)
    if (env.isDev) plugins.browserSync.stream()
  } catch (err) {
    await notifyError({ title: 'images', message: err?.message || String(err) })
    logger.error('images', err?.stack || err?.message || String(err))

    if (env.isProd) throw err
  }
}
