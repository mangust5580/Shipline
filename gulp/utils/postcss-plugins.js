const unwrapDefault = mod => mod && (mod.default ?? mod)

const importOptional = async (name, hint) => {
  try {
    const mod = await import(name)
    return unwrapDefault(mod)
  } catch {
    throw new Error(
      `[postcss] Missing dependency: "${name}" (required for ${hint}). Install: pnpm i -D ${name} (or npm i -D ${name}).`,
    )
  }
}

let autoprefixerP
let cssnanoP
let postcssImportP
let tailwindPostcssP
let pxtoremP

const getAutoprefixer = () => (autoprefixerP ??= import('autoprefixer').then(unwrapDefault))
const getCssnano = () => (cssnanoP ??= import('cssnano').then(unwrapDefault))
const getPostcssImport = () => (postcssImportP ??= importOptional('postcss-import', 'styles.engine="css"'))
const getTailwindPostcss = () => (tailwindPostcssP ??= importOptional('@tailwindcss/postcss', 'styles.engine="tailwind"'))
const getPxtorem = () => (pxtoremP ??= importOptional('postcss-pxtorem', 'styles.postcss.pxtorem'))

export const getPostcssPlugins = async (engine, stylesCfg) => {
  const plugins = []

  if (engine === 'css') {
    const postcssImport = await getPostcssImport()
    plugins.push(postcssImport())
  }

  if (engine === 'tailwind') {
    const tailwindPostcss = await getTailwindPostcss()
    plugins.push(tailwindPostcss())
  }

  const cfg = stylesCfg?.postcss ?? {}

  if (cfg.autoprefixer) {
    const autoprefixer = await getAutoprefixer()
    plugins.push(autoprefixer())
  }

  if (cfg.pxtorem) {
    const pxtorem = await getPxtorem()
    plugins.push(pxtorem(cfg.pxtorem))
  }

  if (cfg.cssnano) {
    const cssnano = await getCssnano()
    plugins.push(cssnano())
  }

  return plugins
}