import path from 'node:path'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import { spawn } from 'node:child_process'

import { globSafe, toPosix } from '#gulp/utils/glob.js'
import { createLimit } from '#gulp/utils/limit.js'

import { paths } from '#config/paths.js'
import { audio as cfg } from '#config/audio.js'
import { features } from '#config/features.js'
import { plugins } from '#config/plugins.js'
import { env } from '#gulp/utils/env.js'
import { lazyDefault } from '#gulp/utils/lazy.js'
import { notifyError } from '#gulp/utils/notify.js'
import { logger } from '#gulp/utils/logger.js'
import {
  readMediaIndex,
  writeMediaIndex,
  stableHash,
  fileSigFromStat,
  mediaCacheDirFor,
  mediaBaseNameFor,
  ensureFileExists,
} from '#gulp/utils/cache.js'

let ffmpegPath = null

async function ensureDir(dirAbs) {
  await fs.mkdir(dirAbs, { recursive: true })
}

async function statSafe(abs) {
  try {
    return await fs.stat(abs)
  } catch {
    return null
  }
}

async function shouldBuild(inputAbs, outputAbs) {
  const inSt = await statSafe(inputAbs)
  const outSt = await statSafe(outputAbs)
  if (!inSt) return false
  if (!outSt) return true
  return inSt.mtimeMs > outSt.mtimeMs
}

async function copyTarget(inputAbs, outAbs) {
  if (!(await shouldBuild(inputAbs, outAbs))) return
  await ensureDir(path.dirname(outAbs))
  await fs.copyFile(inputAbs, outAbs)
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('audioTask: ffmpeg-static binary not found'))
      return
    }

    const p = spawn(ffmpegPath, ['-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    p.stderr.on('data', d => {
      stderr += String(d)
    })

    p.on('error', reject)
    p.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`audioTask: ffmpeg failed (code ${code}).\n${stderr}`))
    })
  })
}

function outBaseFor(inputAbs) {
  const rel = toPosix(path.relative(paths.assets.audioBase, inputAbs))
  const relNoExt = rel.replace(path.extname(rel), '')
  const outDir = path.join(paths.out, cfg.outSubdir, path.dirname(relNoExt))
  const baseName = path.basename(relNoExt)
  return { outDir, baseName }
}

function loudnormFilter() {
  if (!cfg.loudnorm?.enabled) return null
  const i = cfg.loudnorm.i ?? -16
  const tp = cfg.loudnorm.tp ?? -1.5
  const lra = cfg.loudnorm.lra ?? 11
  return `loudnorm=I=${i}:TP=${tp}:LRA=${lra}`
}

export const audioTask = async () => {
  if (!features.media?.audio?.enabled) {
    await lazyDefault('ffmpeg-static', {
      enabled: false,
      skipLog: '[audio] module disabled → ffmpeg not loaded',
    })
    return
  }

  const mode = env.isDev
    ? (features.media.audio.devMode ?? 'copy')
    : (features.media.audio.buildMode ?? 'transcode')

  try {
    if (!fssync.existsSync(paths.assets.audioBase)) return

    const files = await globSafe(toPosix(paths.assets.audio), {
      onlyFiles: true,
      absolute: true,
    })

    if (!files.length) return

    if (mode === 'copy') {
      await lazyDefault('ffmpeg-static', {
        enabled: false,
        skipLog: '[audio] devMode=copy → ffmpeg not loaded',
      })

      const limit = createLimit(cfg.concurrency ?? 1)
      await Promise.all(
        files.map(inputAbs =>
          limit(async () => {
            const rel = toPosix(path.relative(paths.assets.audioBase, inputAbs))
            const outAbs = path.join(paths.out, cfg.outSubdir, rel)
            await copyTarget(inputAbs, outAbs)
          }),
        ),
      )

      plugins.browserSync.stream()
      return
    }

    ffmpegPath = await lazyDefault('ffmpeg-static')
    if (!ffmpegPath) throw new Error('[audio] Failed to load ffmpeg-static.')

    const limit = createLimit(cfg.concurrency ?? 1)
    const af = loudnormFilter()

    const paramsHash = stableHash({ cfg, af })
    const index = await readMediaIndex()
    index.audio ??= {}

    const requiredOutputs = baseName => {
      const out = []
      if (cfg.opus?.enabled) out.push(`${baseName}${cfg.opus.ext ?? '.opus'}`)
      if (cfg.mp3?.enabled) out.push(`${baseName}${cfg.mp3.ext ?? '.mp3'}`)
      return out
    }

    await Promise.all(
      files.map(inputAbs =>
        limit(async () => {
          const rel = toPosix(path.relative(paths.assets.audioBase, inputAbs))
          const ext = path.extname(rel).toLowerCase()
          const relNoExt = rel.replace(path.extname(rel), '')
          const baseName = mediaBaseNameFor(relNoExt)

          const { outDir } = outBaseFor(inputAbs)
          await ensureDir(outDir)

          const inSt = await statSafe(inputAbs)
          if (!inSt) return
          const sig = fileSigFromStat(inSt)

          const cacheDir = path.join(mediaCacheDirFor('audio', relNoExt), `${baseName}__${ext.slice(1)}`)
          const req = requiredOutputs(baseName)

          const cached = index.audio[rel]
          const hasAll = await (async () => {
            if (!cached) return false
            if (cached.sig !== sig || cached.paramsHash !== paramsHash) return false
            if (!req.length) return false
            for (const fileName of req) {
              const ok = await ensureFileExists(path.join(cacheDir, fileName))
              if (!ok) return false
            }
            return true
          })()

          if (!hasAll) {
            await ensureDir(cacheDir)

            if (cfg.opus?.enabled) {
              await runFfmpeg([
                '-i',
                inputAbs,
                ...(af ? ['-af', af] : []),
                '-c:a',
                'libopus',
                '-b:a',
                cfg.opus.bitrate ?? '96k',
                path.join(cacheDir, `${baseName}${cfg.opus.ext ?? '.opus'}`),
              ])
            }

            if (cfg.mp3?.enabled) {
              await runFfmpeg([
                '-i',
                inputAbs,
                ...(af ? ['-af', af] : []),
                '-c:a',
                'libmp3lame',
                '-q:a',
                String(cfg.mp3.vbrQuality ?? 3),
                path.join(cacheDir, `${baseName}${cfg.mp3.ext ?? '.mp3'}`),
              ])
            }

            index.audio[rel] = { sig, paramsHash }
          }

          for (const fileName of req) {
            await fs.copyFile(path.join(cacheDir, fileName), path.join(outDir, fileName))
          }
        }),
      ),
    )

    await writeMediaIndex(index)

    plugins.browserSync.stream()
  } catch (err) {
    await notifyError({ title: 'audio', message: err?.message || String(err) })
    logger.error('audio', err?.stack || err?.message || String(err))
    if (env.isProd) throw err
  }
}
