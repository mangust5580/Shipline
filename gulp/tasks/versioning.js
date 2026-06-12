import fs from 'node:fs/promises'
import path from 'node:path'

import gulp from 'gulp'
import rev from 'gulp-rev'
import revRewrite from 'gulp-rev-rewrite'
import through2 from 'through2'

import { env } from '#gulp/utils/env.js'
import { paths } from '#config/paths.js'
import { features } from '#config/features.js'
import { versioning } from '#config/versioning.js'

const getAssetsGlobs = () => {
  const include = versioning.include || {}
  const byGroup = versioning.globsByGroup || {}

  const selected = Object.entries(byGroup)
    .filter(([k]) => Boolean(include[k]))
    .flatMap(([, v]) => (Array.isArray(v) ? v : []))
    .filter(Boolean)

  return selected.length ? selected : versioning.assetsGlobs || []
}

const runStream = stream =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

const toPosix = p => p.replaceAll('\\', '/')

const rewriteSourceMappingURL = manifestObj =>
  through2.obj(function (file, _enc, cb) {
    try {
      if (!file.isBuffer()) return cb(null, file)

      const ext = path.extname(file.path).toLowerCase()
      if (ext !== '.js' && ext !== '.css') return cb(null, file)

      const absDir = path.dirname(file.path)
      const relDir = toPosix(path.relative(paths.out, absDir))

      const mapRef = (refRaw, baseMatch) => {
        const ref = String(refRaw || '').trim()
        if (!ref) return baseMatch

        const [refPath, suffix] = ref.split(/(?=[?#])/)
        const clean = toPosix(refPath)

        const candidateA = relDir && relDir !== '.' ? toPosix(path.posix.join(relDir, clean)) : clean
        const candidateB = clean

        const revved = manifestObj[candidateA] || manifestObj[candidateB]
        if (!revved) return baseMatch

        const target = String(revved)
        const relToFile = toPosix(path.posix.relative(relDir && relDir !== '.' ? relDir : '', target))
        const out = (relToFile.startsWith('../') || relToFile.startsWith('./') || !relToFile.includes('/')) ? relToFile : `./${relToFile}`
        return baseMatch.replace(refRaw, `${out}${suffix || ''}`)
      }

      const src = file.contents.toString('utf8')

      const jsRe = /\/\/#\s*sourceMappingURL=([^\s*]+)\s*$/gm
      const cssRe = /\/\*#\s*sourceMappingURL=([^\s*]+)\s*\*\//gm

      const out = src
        .replace(jsRe, m => {
          const mm = m.match(/sourceMappingURL=([^\s*]+)/)
          return mm ? mapRef(mm[1], m) : m
        })
        .replace(cssRe, m => {
          const mm = m.match(/sourceMappingURL=([^\s*]+)/)
          return mm ? mapRef(mm[1], m) : m
        })

      file.contents = Buffer.from(out)
      cb(null, file)
    } catch (e) {
      cb(e)
    }
  })

export const versioningTask = async () => {
  if (!env.isProd) return
  if (!features.versioning?.enabled) return

  const assetsGlobs = getAssetsGlobs()
  const rewriteGlobs = versioning.rewriteGlobs || []
  const manifestPath = path.join(paths.out, versioning.manifestName)

  await runStream(
    gulp
      .src(assetsGlobs, {
        cwd: paths.out,
        base: paths.out,
        allowEmpty: true,
        encoding: false,
      })
      .pipe(rev())
      .pipe(gulp.dest(paths.out))
      .pipe(rev.manifest(versioning.manifestName))
      .pipe(gulp.dest(paths.out)),
  )

  const manifest = await fs.readFile(manifestPath)
  const manifestObj = JSON.parse(manifest.toString('utf8'))

  await runStream(
    gulp
      .src(rewriteGlobs, {
        cwd: paths.out,
        base: paths.out,
        allowEmpty: true,
      })
      .pipe(revRewrite({ manifest }))
      .pipe(rewriteSourceMappingURL(manifestObj))
      .pipe(gulp.dest(paths.out)),
  )
}
