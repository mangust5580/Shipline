import { paths } from '#config/paths.js'
import { project } from '#config/project.js'
import { plugins } from '#config/plugins.js'

export const serverTask = done => {
  plugins.browserSync.init({
    server: { baseDir: paths.out },
    port: project.server.port,
    open: project.server.open,
    notify: project.server.notify,
    ui: project.server.ui,
    cors: project.server.cors,
  })

  done()
}

export const reloadTask = done => {
  plugins.browserSync.reload()
  done()
}
