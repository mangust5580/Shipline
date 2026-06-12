import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseProject = {
  server: {
    port: 3000,
    open: false,
    notify: false,
    ui: false,
    cors: true,
  },
  watch: {
    debounceMs: 150,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  },
}

export const project = await loadUserConfig(baseProject, 'project')
