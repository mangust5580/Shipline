import fs from 'node:fs'
import path from 'node:path'

import { STAGES } from '#gulp/constants.js'

import { globSafe, toPosix } from '#gulp/utils/glob.js'
import { logger } from '#gulp/utils/logger.js'

import { env } from '#gulp/utils/env.js'
import { paths } from '#config/paths.js'
import { features } from '#config/features.js'
import { styles } from '#config/styles.js'
import { engines } from '#config/engines.js'
import { i18n as i18nCfg } from '#config/i18n.js'
import { scaffold } from '#config/scaffold.js'
import { scaffoldTask } from '#gulp/utils/scaffold.js'
import { applyDisabledFilesPolicy, ensureNoDisabledFiles } from '#gulp/core/feature-guard.js'

const detectStage = () => {
  const raw = String(process.env.STAGE || process.env.GULP_STAGE || '').trim().toLowerCase()
  if (raw) {
    if (raw === 'preview') return STAGES.PREVIEW
    if (raw === 'buildfast' || raw === 'build_fast' || raw === 'build-fast') return STAGES.BUILD_FAST
    if (raw === 'build') return STAGES.BUILD
    return STAGES.DEV
  }

  const args = new Set(process.argv.slice(2))
  if ([...args].some(a => a === 'preview')) return STAGES.PREVIEW
  if ([...args].some(a => a === 'buildFast' || a === 'buildfast' || a === 'build_fast' || a === 'build-fast'))
    return STAGES.BUILD_FAST
  if ([...args].some(a => a === 'build' || a.startsWith('build:'))) return STAGES.BUILD
  return STAGES.DEV
}

const getStructurePolicy = stage => {
  const q = features.quality || {}
  const cfg = q.validateStructure
  if (cfg && typeof cfg === 'object') {
    if (cfg.enabled === false) return 'off'
    if (stage === STAGES.BUILD) return cfg.build || 'fail'
    if (stage === STAGES.PREVIEW) return cfg.preview || 'fail'
    if (stage === STAGES.BUILD_FAST) return cfg.buildFast || 'fail'
    return cfg.dev || 'warn'
  }

  return env.isProd ? 'fail' : 'warn'
}

const shouldRunRule = ruleKey => {
  const q = features.quality || {}
  const cfg = q.validateStructure
  if (!cfg || typeof cfg !== 'object') return true
  const rules = cfg.rules || {}
  return rules[ruleKey] !== false
}

const handleViolation = ({ msg, stage, policyOverride }) => {
  const policy = policyOverride || getStructurePolicy(stage)

  if (policy === 'off' || policy === 'ignore') return
  if (policy === 'warn') {
    logger.warn('structure', msg)
    return
  }
  throw new Error(`[structure] ${msg}`)
}

const handleDisabledFilesViolation = (stage, msg) => {
  applyDisabledFilesPolicy({
    stage,
    msg,
    policy: features.media?.policy,
    fallback: () => handleViolation({ msg, stage }),
  })
}

const hasAny = async pattern => {
  const files = await globSafe(pattern, { onlyFiles: true, absolute: true })
  return files.length > 0
}

const existsFile = p => {
  try {
    return fs.statSync(p).isFile()
  } catch {
    return false
  }
}

const ensurePagesExist = async stage => {
  if (!shouldRunRule('requirePages')) return

  const engine = engines.templates
  const found = await hasAny(toPosix(paths.pages.entry))
  if (!found) {
    handleViolation({
      stage,
      msg: `No pages found for templates engine "${engine}". Create at least one file in "src/pages" (e.g. index.${
        engine === 'nunjucks' ? 'njk' : engine === 'handlebars' ? 'hbs' : engine
      }).`,
    })
  }
}

const ensureEntriesExist = stage => {
  if (shouldRunRule('requireScriptsEntry')) {
    if (!existsFile(paths.scripts.entry)) {
      handleViolation({
        stage,
        msg: `Missing scripts entry: ${path.relative(process.cwd(), paths.scripts.entry).replace(/\\/g, '/')}`,
      })
    }
  }

  if (shouldRunRule('requireStylesEntry')) {
    const entry =
      styles.engine === 'css'
        ? paths.styles.entryCss
        : styles.engine === 'tailwind'
          ? paths.styles.entryTailwind
          : paths.styles.entryScss

    const entries = Array.isArray(entry) ? entry : [entry]

    for (const e of entries) {
      if (!existsFile(e)) {
        handleViolation({
          stage,
          msg: `Missing styles entry for engine "${styles.engine}": ${path
            .relative(process.cwd(), e)
            .replace(/\\/g, '/')}`,
        })
      }
    }
  }
}

const ensureFaviconsSource = stage => {
  if (!features.favicons?.enabled) return
  if (!shouldRunRule('requireFaviconsSource')) return

  const exists = existsFile(paths.assets.faviconSvg)
  if (!exists) {
    const isStrict = env.isProd ? !!features.favicons?.requireSourceInBuild : false
    handleViolation({
      stage,
      policyOverride: isStrict ? 'fail' : undefined,
      msg: `Favicons are enabled but source file is missing: ${path
        .relative(process.cwd(), paths.assets.faviconSvg)
        .replace(/\\/g, '/')}`,
    })
  }
}

const ensureI18nStructure = stage => {
  if (!features.i18n?.enabled) return
  const strictPolicy = 'fail'
  const locales = (i18nCfg.locales || []).map(l => String(l).trim().toLowerCase()).filter(Boolean)
  const dictDir = i18nCfg.dictionaries?.dir || 'src/data/locales'
  const absDir = path.isAbsolute(dictDir) ? dictDir : path.join(process.cwd(), dictDir)
  if (!fs.existsSync(absDir)) {
    handleViolation({
      stage,
      policyOverride: strictPolicy,
      msg: `i18n is enabled but dictionaries directory does not exist: ${dictDir}`,
    })
    return
  }

  for (const locale of locales) {
    const file = path.join(absDir, `${locale}.json`)
    if (!existsFile(file)) {
      handleViolation({
        stage,
        policyOverride: strictPolicy,
        msg: `i18n is enabled but missing dictionary file: ${path
          .relative(process.cwd(), file)
          .replace(/\\/g, '/')}`,
      })
    }
  }
}

const ensureNoDisabledMediaFiles = async stage => {
  const assetsBase = path.join(paths.src, 'assets')

  const audioGlob = toPosix(path.join(assetsBase, '**/*.{wav,mp3,ogg,opus,m4a,aac,flac}'))
  const videoGlob = toPosix(path.join(assetsBase, '**/*.{mp4,mov,m4v,webm}'))

  if (!features.media?.audio?.enabled) {
    if (await hasAny(audioGlob)) {
      handleDisabledFilesViolation(
        stage,
        `Found audio files under "src/assets" while media.audio is disabled. Enable the module in config/features.js or remove the files.`,
      )
    }
  }

  if (!features.media?.video?.enabled) {
    if (await hasAny(videoGlob)) {
      handleDisabledFilesViolation(
        stage,
        `Found video files under "src/assets" while media.video is disabled. Enable the module in config/features.js or remove the files.`,
      )
    }
  }
}

const ensureNoDisabledStaticFiles = async stage => {
  await ensureNoDisabledFiles({
    stage,
    enabled: features.static?.enabled !== false,
    baseDir: paths.assets.staticBase,
    glob: toPosix(path.join(paths.assets.staticBase, '**/*')),
    msg: `Found files in "src/static" while static module is disabled. Enable the module in config/features.js (features.static.enabled=true) or remove the files.`,
    policy: features.static?.policy,
    fallback: () =>
      handleViolation({
        stage,
        msg: `Found files in "src/static" while static module is disabled. Enable the module in config/features.js (features.static.enabled=true) or remove the files.`,
      }),
  })
}

const ensureNoDisabledSvgSpriteFiles = async stage => {
  await ensureNoDisabledFiles({
    stage,
    enabled: features.svgSprite?.enabled !== false,
    baseDir: paths.assets.iconsBase,
    glob: toPosix(paths.assets.icons),
    msg: `Found SVG icons in "src/assets/icons" while svgSprite module is disabled. Enable the module in config/features.js (features.svgSprite.enabled=true) or remove the files.`,
    policy: features.svgSprite?.policy,
    fallback: () =>
      handleViolation({
        stage,
        msg: `Found SVG icons in "src/assets/icons" while svgSprite module is disabled. Enable the module in config/features.js (features.svgSprite.enabled=true) or remove the files.`,
      }),
  })
}

export const createValidateStructureTask =
  ({ stage }) =>
    async () => {
      const s = stage || detectStage()

      if (scaffold?.mode === 'auto') {
        await scaffoldTask()
      }

      await ensureI18nStructure(s)
      await ensurePagesExist(s)
      ensureEntriesExist(s)
      ensureFaviconsSource(s)
      await ensureNoDisabledStaticFiles(s)
      await ensureNoDisabledSvgSpriteFiles(s)
      await ensureNoDisabledMediaFiles(s)
    }

export const validateStructureTask = async () => {
  const task = createValidateStructureTask({ stage: detectStage() })
  await task()
}
