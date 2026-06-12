import fs from 'node:fs'
import path from 'node:path'

import posthtml from 'posthtml'

import { env } from '#gulp/utils/env.js'
import { paths } from '#config/paths.js'
import { templates } from '#config/templates.js'
import { expressionsPlugin } from '#gulp/pipelines/templates/html/expressions.js'

// Replaces <link href="styles/critical.css"> with an inline <style> block.
// Styles task always runs before templates, so the file already exists in paths.out.
const inlineCriticalCssPlugin = () => {
  const cssPath = path.join(paths.out, paths.styles.dest, 'critical.css')

  return tree => {
    let cssContent

    tree.match({ tag: 'link', attrs: { href: /critical\.css$/ } }, () => {
      if (cssContent === undefined) {
        cssContent = fs.readFileSync(cssPath, 'utf8')
      }

      return { tag: 'style', content: [cssContent] }
    })

    return tree
  }
}

const removeDevAttrsPlugin = () => tree => {
  tree.match({ attrs: true }, node => {
    if (!node.attrs) return node
    delete node.attrs['data-dev']
    delete node.attrs['data-debug']
    return node
  })

  return tree
}

const includePlugin = ({ root = paths.src } = {}) => {
  const rootDir = path.resolve(root)

  const readInclude = src => {
    const filePath = path.resolve(rootDir, src)
    const relativePath = path.relative(rootDir, filePath)

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`[posthtml-include] Include is outside root: ${src}`)
    }

    return fs.readFileSync(filePath, 'utf8')
  }

  const processNode = node => {
    if (!node || typeof node !== 'object') return node

    if (node.tag === 'include') {
      const src = node.attrs?.src
      if (!src) throw new Error('[posthtml-include] Missing "src" attribute')

      const html = readInclude(src)
      return posthtml([includePlugin({ root: rootDir })]).process(html, { sync: true }).tree
    }

    if (Array.isArray(node.content)) {
      node.content = node.content.flatMap(child => {
        const next = processNode(child)
        return Array.isArray(next) ? next : [next]
      })
    }

    return node
  }

  return tree => {
    tree.walk(processNode)
    return tree
  }
}

export const getPosthtmlPlugins = ({ locals = {}, enableExpressions = false } = {}) => {
  const cfg = templates.html
  const p = []

  if (cfg.posthtml?.includes) {
    p.push(includePlugin({ root: cfg.posthtml.includesRoot || paths.src }))
  }

  if (env.isProd) {
    p.push(inlineCriticalCssPlugin())
  }

  if (cfg.posthtml.enabled && cfg.posthtml.prodOnlyTransforms) {
    p.push(removeDevAttrsPlugin())
  }

  if (enableExpressions && cfg.expressions?.enabled) {
    p.push(
      expressionsPlugin({
        ...locals,
        isProd: env.isProd,
        isDev: env.isDev,
      }),
    )
  }

  return p
}
