import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseScaffold = {
  mode: 'strict',
  devOnly: true,
  verbose: false,
}

export const scaffold = await loadUserConfig(baseScaffold, 'scaffold')
