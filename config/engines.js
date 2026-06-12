import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseEngines = {
  templates: 'html',
  styles: 'scss',
  scripts: 'esbuild',
}

export const engines = Object.freeze(await loadUserConfig(baseEngines, 'engines'))
