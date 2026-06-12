const argv = new Set(process.argv.slice(2))

const normalizeStage = s => String(s || '').trim().toLowerCase()

const stageFromEnv = () => {
  const raw = normalizeStage(process.env.STAGE || process.env.GULP_STAGE)
  if (!raw) return null
  if (raw === 'dev' || raw === 'development') return 'dev'
  if (raw === 'preview') return 'preview'
  if (raw === 'build') return 'build'
  if (raw === 'buildfast' || raw === 'build_fast' || raw === 'build-fast') return 'buildFast'
  return raw
}

const stageFromArgv = () => {
  const args = [...argv]
  if (args.some(a => a === 'preview')) return 'preview'
  if (args.some(a => a === 'buildFast')) return 'buildFast'
  if (args.some(a => a === 'build' || a.startsWith('build:') || /^build($|:|[A-Z])/.test(a))) return 'build'
  return 'dev'
}

const stage = stageFromEnv() || stageFromArgv()

const isProdByStage = stage === 'build' || stage === 'preview' || stage === 'buildFast'
const isProdByNodeEnv = process.env.NODE_ENV === 'production'
const isProdFlag = argv.has('--prod') || argv.has('-p')

export const env = {
  stage,
  isProd: isProdByStage || isProdByNodeEnv || isProdFlag,
  isDev: !(isProdByStage || isProdByNodeEnv || isProdFlag),
}
