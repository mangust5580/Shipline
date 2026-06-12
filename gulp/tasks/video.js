import path from 'node:path'
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import { spawn } from 'node:child_process'

import { globSafe, toPosix } from '#gulp/utils/glob.js'
import { createLimit } from '#gulp/utils/limit.js'

import { paths } from '#config/paths.js'
import { video as cfg } from '#config/video.js'
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

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('videoTask: ffmpeg-static binary not found'))
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
      else reject(new Error(`videoTask: ffmpeg failed (code ${code}).\n${stderr}`))
    })
  })
}

function outBaseFor(inputAbs) {
  const rel = toPosix(path.relative(paths.assets.videoBase, inputAbs))
  const relNoExt = rel.replace(path.extname(rel), '')
  const outDir = path.join(paths.out, cfg.outSubdir, path.dirname(relNoExt))
  const baseName = path.basename(relNoExt)
  return { outDir, baseName }
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

async function buildTarget({ inputAbs, outAbs, args, force = false }) {
  if (!force && !(await shouldBuild(inputAbs, outAbs))) return
  await runFfmpeg(['-i', inputAbs, ...args, outAbs])
}

async function buildStill({
  inputAbs,
  outAbs,
  atSeconds,
  width,
  formatArgs,
  vfExtra,
  force = false,
}) {
  if (!force && !(await shouldBuild(inputAbs, outAbs))) return

  const vf = [`scale=${width}:-2:flags=lanczos`, vfExtra ?? null].filter(Boolean).join(',')

  await runFfmpeg([
    '-ss',
    String(atSeconds),
    '-i',
    inputAbs,
    '-frames:v',
    '1',
    '-vf',
    vf,
    ...formatArgs,
    outAbs,
  ])
}

function qvFromPercent(p) {
  const clamped = Math.max(1, Math.min(100, p))
  const q = Math.round((100 - clamped) / 3)
  return String(Math.max(2, Math.min(31, q)))
}

async function buildWebpThumb({
  inputAbs,
  outAbs,
  atSeconds,
  width,
  quality,
  sharpen,
  force = false,
}) {
  if (!force && !(await shouldBuild(inputAbs, outAbs))) return

  const vf = [`scale=${width}:-2:flags=lanczos`, sharpen ? `unsharp=5:5:${sharpen}:5:5:0` : null]
    .filter(Boolean)
    .join(',')

  await runFfmpeg([
    '-ss',
    String(atSeconds),
    '-i',
    inputAbs,
    '-frames:v',
    '1',
    '-vf',
    vf,
    '-c:v',
    'libwebp',
    '-quality',
    String(quality),
    '-preset',
    'picture',
    '-lossless',
    '0',
    outAbs,
  ])
}

export const videoTask = async () => {
  if (!features.media?.video?.enabled) {
    await lazyDefault('ffmpeg-static', {
      enabled: false,
      skipLog: '[video] module disabled → ffmpeg not loaded',
    })
    return
  }

  const mode = env.isDev
    ? (features.media.video.devMode ?? 'copy')
    : (features.media.video.buildMode ?? 'transcode')

  try {
    if (!fssync.existsSync(paths.assets.videoBase)) return

    const files = await globSafe(toPosix(paths.assets.video), {
      onlyFiles: true,
      absolute: true,
    })

    if (!files.length) return

    if (mode === 'copy') {
      await lazyDefault('ffmpeg-static', {
        enabled: false,
        skipLog: '[video] devMode=copy → ffmpeg not loaded',
      })

      const limit = createLimit(cfg.concurrency ?? 1)
      await Promise.all(
        files.map(inputAbs =>
          limit(async () => {
            const rel = toPosix(path.relative(paths.assets.videoBase, inputAbs))
            const outAbs = path.join(paths.out, cfg.outSubdir, rel)
            await copyTarget(inputAbs, outAbs)
          }),
        ),
      )

      plugins.browserSync.stream()
      return
    }

    ffmpegPath = await lazyDefault('ffmpeg-static')
    if (!ffmpegPath) throw new Error('[video] Failed to load ffmpeg-static.')

    const limit = createLimit(cfg.concurrency ?? 1)

    const paramsHash = stableHash({ cfg })
    const index = await readMediaIndex()
    index.video ??= {}

    const requiredOutputs = baseName => {
      const out = []
      if (cfg.webm?.enabled) out.push(`${baseName}${cfg.webm.ext ?? '.webm'}`)
      if (cfg.mp4?.enabled) out.push(`${baseName}${cfg.mp4.ext ?? '.mp4'}`)
      if (cfg.posters?.enabled) out.push(`${baseName}${cfg.posters.ext ?? '.poster.jpg'}`)
      if (cfg.thumbs?.enabled) out.push(`${baseName}${cfg.thumbs.ext ?? '.thumb.webp'}`)
      return out
    }

    await Promise.all(
      files.map(inputAbs =>
        limit(async () => {
          const rel = toPosix(path.relative(paths.assets.videoBase, inputAbs))
          const ext = path.extname(rel).toLowerCase()
          const relNoExt = rel.replace(path.extname(rel), '')
          const baseName = mediaBaseNameFor(relNoExt)

          const { outDir } = outBaseFor(inputAbs)
          await ensureDir(outDir)

          const inSt = await statSafe(inputAbs)
          if (!inSt) return
          const sig = fileSigFromStat(inSt)

          const cacheDir = path.join(mediaCacheDirFor('video', relNoExt), `${baseName}__${ext.slice(1)}`)
          const req = requiredOutputs(baseName)

          const cached = index.video[rel]
          const hasAll = await (async () => {
            if (!cached) return false
            if (cached.sig !== sig || cached.paramsHash !== paramsHash) return false
            if (!req.length) return false
            if (!cacheDir) return false
            for (const fileName of req) {
              const ok = await ensureFileExists(path.join(cacheDir, fileName))
              if (!ok) return false
            }
            return true
          })()

          if (!hasAll) {
            await ensureDir(cacheDir)

            if (cfg.webm?.enabled) {
              await buildTarget({
                inputAbs,
                outAbs: path.join(cacheDir, `${baseName}${cfg.webm.ext ?? '.webm'}`),
                args: cfg.webm.args ?? [],
                force: true,
              })
            }

            if (cfg.mp4?.enabled) {
              await buildTarget({
                inputAbs,
                outAbs: path.join(cacheDir, `${baseName}${cfg.mp4.ext ?? '.mp4'}`),
                args: cfg.mp4.args ?? [],
                force: true,
              })
            }

            if (cfg.posters?.enabled) {
              await buildStill({
                inputAbs,
                outAbs: path.join(cacheDir, `${baseName}${cfg.posters.ext ?? '.poster.jpg'}`),
                atSeconds: cfg.posters.atSeconds ?? 0.5,
                width: cfg.posters.width ?? 1280,
                formatArgs: ['-q:v', qvFromPercent(cfg.posters.jpgQ ?? 82)],
                vfExtra: null,
                force: true,
              })
            }

            if (cfg.thumbs?.enabled) {
              await buildWebpThumb({
                inputAbs,
                outAbs: path.join(cacheDir, `${baseName}${cfg.thumbs.ext ?? '.thumb.webp'}`),
                atSeconds: cfg.thumbs.atSeconds ?? 1.5,
                width: cfg.thumbs.width ?? 480,
                quality: cfg.thumbs.webpQuality ?? 82,
                sharpen: cfg.thumbs.sharpen ?? 0.6,
                force: true,
              })
            }

            index.video[rel] = { sig, paramsHash }
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
    await notifyError({ title: 'video', message: err?.message || String(err) })
    logger.error('video', err?.stack || err?.message || String(err))
    if (env.isProd) throw err
  }
}
