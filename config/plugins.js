import browserSyncCreator from 'browser-sync'
import fileInclude from 'gulp-file-include'
import plumber from 'gulp-plumber'
import posthtml from 'gulp-posthtml'
import gulpIf from 'gulp-if'
import sourcemaps from 'gulp-sourcemaps'
import postcss from 'gulp-postcss'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const basePlugins = {
  browserSync: browserSyncCreator.create(),
  fileInclude,
  plumber,
  posthtml,
  gulpIf,
  sourcemaps,
  postcss,
}

export const plugins = await loadUserConfig(basePlugins, 'plugins')
