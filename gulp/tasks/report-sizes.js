import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

import fg from 'fast-glob'

import { paths } from '#config/paths.js'
import { features } from '#config/features.js'
import { env } from '#gulp/utils/env.js'

const prettyBytes = n => {
  if (!Number.isFinite(n)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i ? 2 : 0)} ${units[i]}`
}

const gzipSize = buf => zlib.gzipSync(buf, { level: 9 }).byteLength
const brotliSize = buf =>
  zlib.brotliCompressSync(buf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).byteLength

const PRECOMPRESSED_EXT = new Set([
  '.woff2',
  '.woff',
  '.eot',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.ogg',
  '.pdf',
  '.zip',
])

const isPrecompressed = filePath => PRECOMPRESSED_EXT.has(path.extname(filePath).toLowerCase())

export const createReportSizesTask = ({ stage }) => {
  const cfg = features.reports?.bundleSizes || {}

  const enabled = cfg.enabled !== false
  if (!enabled) return done => done()

  const enabledByStage =
    stage === 'build'
      ? cfg.build !== false
      : stage === 'buildFast'
        ? cfg.buildFast === true
        : stage === 'preview'
          ? cfg.preview === true
          : false

  if (!enabledByStage) return done => done()

  const include = cfg.include || ['**/*.*']
  const exclude = cfg.exclude || ['**/*.map']
  const topN = Number.isFinite(cfg.top) ? cfg.top : 20
  const writeJson = cfg.writeJson !== false
  const jsonFile = cfg.jsonFile || 'reports/bundle-sizes.json'

  return async () => {
    if (!env.isProd) return

    const outDir = paths.out
    const files = await fg(include, {
      cwd: outDir,
      onlyFiles: true,
      dot: true,
      ignore: exclude,
    })

    const rows = []
    let totalRaw = 0
    let totalGzip = 0
    let totalBrotli = 0

    for (const rel of files) {
      const abs = path.join(outDir, rel)
      const stat = fs.statSync(abs)
      if (!stat.isFile()) continue

      const raw = fs.readFileSync(abs)
      const r = raw.byteLength
      const pre = isPrecompressed(rel)
      const g = pre ? r : gzipSize(raw)
      const b = pre ? r : brotliSize(raw)

      totalRaw += r
      totalGzip += g
      totalBrotli += b

      rows.push({
        file: rel.replace(/\\/g, '/'),
        raw: r,
        gzip: g,
        brotli: b,
        precompressed: pre,
      })
    }

    rows.sort((a, b) => b.raw - a.raw)
    const top = rows.slice(0, topN)

    console.log(`\n[report] Bundle sizes (${rows.length} files)`)
    console.log('[report] Note: binary/precompressed assets use gzip/br = raw for readability.')
    console.log(
      `Raw: ${prettyBytes(totalRaw)} | Gzip: ${prettyBytes(totalGzip)} | Brotli: ${prettyBytes(totalBrotli)}`,
    )
    console.log('[report] Top files by raw size:')
    for (const r of top) {
      console.log(
        `- ${r.file}  raw ${prettyBytes(r.raw)}  gzip ${prettyBytes(r.gzip)}  br ${prettyBytes(r.brotli)}`,
      )
    }

    if (writeJson) {
      const report = {
        generatedAt: new Date().toISOString(),
        totals: { raw: totalRaw, gzip: totalGzip, brotli: totalBrotli },
        files: rows,
      }
      const outPath = path.join(outDir, jsonFile)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
      console.log(`[report] Saved: ${jsonFile}`)
    }
  }
}
