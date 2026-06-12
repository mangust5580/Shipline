import {env} from '#gulp/utils/env.js'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

const baseVideo = {
  outSubdir: 'video',
  concurrency: env.isProd ? 2 : 1,

  webm: {
    enabled: true,
    ext: '.webm',
    args: env.isProd
      ? [
        '-c:v', 'libvpx-vp9',
        '-crf', '32',
        '-b:v', '0',
        '-row-mt', '1',
        '-deadline', 'good',
        '-cpu-used', '2',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'libopus',
        '-b:a', '96k',
      ]
      : [
        '-c:v', 'libvpx-vp9',
        '-crf', '38',
        '-b:v', '0',
        '-deadline', 'realtime',
        '-cpu-used', '6',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'libopus',
        '-b:a', '64k',
      ],
  },

  mp4: {
    enabled: true,
    ext: '.mp4',
    args: env.isProd
      ? [
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-crf', '23',
        '-preset', 'slow',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
      ]
      : [
        '-c:v', 'libx264',
        '-profile:v', 'main',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-crf', '28',
        '-preset', 'veryfast',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
      ],
  },

  posters: {
    enabled: true,
    atSeconds: 0.5,
    ext: '.poster.jpg',
    width: 1280,
    jpgQ: 82,
  },

  thumbs: {
    enabled: true,
    atSeconds: 1.5,
    ext: '.thumb.webp',
    width: 480,
    webpQuality: 82,
    sharpen: 0.6,
  },
}

export const video = await loadUserConfig(baseVideo, 'video')
