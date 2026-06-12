import {env} from '#gulp/utils/env.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseAudio = {
  outSubdir: 'audio',
  concurrency: env.isProd ? 2 : 1,

  loudnorm: {
    enabled: true,
    i: -16,
    tp: -1.5,
    lra: 11,
  },

  opus: {
    enabled: true,
    ext: '.opus',
    bitrate: env.isProd ? '96k' : '64k',
  },

  mp3: {
    enabled: true,
    ext: '.mp3',
    vbrQuality: env.isProd ? 3 : 5,
  },
}

export const audio = await loadUserConfig(baseAudio, 'audio')
