import fs from 'node:fs'
import path from 'node:path'
import { loadUserConfig } from '#gulp/utils/load-user-config.js'

import { env } from '#gulp/utils/env.js'
import { engines } from '#config/engines.js'

const root = process.cwd()

const templatesExtByEngine = {
  html: 'html',
  pug: 'pug',
  nunjucks: 'njk',
  ejs: 'ejs',
  hbs: 'hbs',
  handlebars: 'hbs',
}

const tplExt = templatesExtByEngine[engines.templates] ?? 'html'

const stylesEntriesDir = path.join(root, 'src', 'styles', 'entries')
const stylesMainScss = path.join(root, 'src', 'styles', 'main.scss')

const stylesEntryScss = fs.existsSync(stylesEntriesDir)
  ? fs
      .readdirSync(stylesEntriesDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.scss'))
      .map(d => path.join(stylesEntriesDir, d.name))
      .sort((a, b) => a.localeCompare(b))
      .sort((a, b) => {
        const ac = a.endsWith(`${path.sep}critical.scss`)
        const bc = b.endsWith(`${path.sep}critical.scss`)
        if (ac === bc) return 0
        return ac ? -1 : 1
      })
  : fs.existsSync(stylesMainScss)
    ? [stylesMainScss]
    : []

const basePaths = {
  root,
  src: path.join(root, 'src'),
  dist: path.join(root, 'dist'),
  public: path.join(root, 'public'),
  out: env.isProd ? path.join(root, 'public') : path.join(root, 'dist'),

  pages: {
    entry: path.join(root, 'src', 'pages', `**/*.${tplExt}`),
    html: path.join(root, 'src', 'pages', '**/*.html'),
    pug: path.join(root, 'src', 'pages', '**/*.pug'),
    ejs: path.join(root, 'src', 'pages', '**/*.ejs'),
    hbs: path.join(root, 'src', 'pages', '**/*.hbs'),
    nunjucks: path.join(root, 'src', 'pages', '**/*.njk'),
    watch: [path.join(root, 'src', 'pages', `**/*.${tplExt}`), path.join(root, 'src', 'shared', '**/*')],
  },

  styles: {
    entryScss: stylesEntryScss,
    entryCss: path.join(root, 'src', 'styles', 'main.css'),
    entryTailwind: path.join(root, 'src', 'styles', 'tailwind.css'),
    watch: path.join(root, 'src', 'styles', '**/*.{scss,css}'),
    dest: 'styles',
  },

  scripts: {
    entry: path.join(root, 'src', 'scripts', 'main.js'),
    watch: path.join(root, 'src', 'scripts', '**/*.{js,ts,tsx,jsx}'),
    dest: 'scripts',
  },

  fonts: {
    src: path.join(root, 'src', 'assets', 'fonts', '**/*.{ttf,woff,woff2,otf}'),
    watch: path.join(root, 'src', 'assets', 'fonts', '**/*.{ttf,otf,woff,woff2}'),
    dest: 'fonts',
  },

  assets: {
    imagesBase: path.join(root, 'src', 'assets', 'images'),
    images: path.join(root, 'src', 'assets', 'images', '**/*.{png,jpg,jpeg,webp,avif,gif,ico}'),
    iconsBase: path.join(root, 'src', 'assets', 'images', 'icons'),
    icons: path.join(root, 'src', 'assets', 'images', 'icons', '**/*.svg'),
    svgs: path.join(root, 'src', 'assets', 'images', '**/*.svg'),

    faviconsBase: path.join(root, 'src', 'assets', 'images', 'favicons'),
    favicons: path.join(root, 'src', 'assets', 'images', 'favicons', '**/*'),
    faviconSvg: path.join(root, 'src', 'assets', 'images', 'favicons', 'favicon.svg'),

    staticBase: path.join(root, 'src', 'static'),
    static: path.join(root, 'src', 'static', '**/*'),

    videoBase: path.join(root, 'src', 'assets', 'video'),
    video: path.join(root, 'src', 'assets', 'video', '**/*.{mp4,mov,m4v,webm}'),

    audioBase: path.join(root, 'src', 'assets', 'audio'),
    audio: path.join(root, 'src', 'assets', 'audio', '**/*.{wav,mp3,ogg,opus,m4a,aac,flac}'),
  },
}

export const paths = await loadUserConfig(basePaths, 'paths')
