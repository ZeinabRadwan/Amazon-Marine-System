/**
 * Post-build check: dist must include SPA fallback files from public/
 * (.htaccess for Apache, web.config for IIS) so deploy + route refresh work.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

const required = [
  {
    path: join(dist, 'index.html'),
    label: 'index.html',
    check: (content) => content.length > 0,
    hint: 'Vite build output is missing.',
  },
  {
    path: join(dist, '.htaccess'),
    label: '.htaccess',
    check: (content) =>
      /RewriteEngine\s+On/i.test(content) && /index\.html/i.test(content),
    hint: 'Copy from front/public/.htaccess — required for Apache SPA routes.',
  },
]

const optional = [
  {
    path: join(dist, 'web.config'),
    label: 'web.config',
    check: (content) => /index\.html/i.test(content),
    hint: 'Copy from front/public/web.config — needed for IIS SPA routes.',
  },
]

let failed = false

for (const file of required) {
  if (!existsSync(file.path)) {
    console.error(`[verify-spa-routing] Missing ${file.label} in dist/`)
    console.error(`  ${file.hint}`)
    failed = true
    continue
  }
  const content = readFileSync(file.path, 'utf8')
  if (!file.check(content)) {
    console.error(`[verify-spa-routing] Invalid ${file.label} in dist/`)
    console.error(`  ${file.hint}`)
    failed = true
  }
}

for (const file of optional) {
  if (!existsSync(file.path)) {
    console.warn(`[verify-spa-routing] Optional ${file.label} not in dist/ (${file.hint})`)
    continue
  }
  const content = readFileSync(file.path, 'utf8')
  if (!file.check(content)) {
    console.warn(`[verify-spa-routing] Optional ${file.label} may be invalid (${file.hint})`)
  }
}

if (failed) {
  process.exit(1)
}

console.log('[verify-spa-routing] OK — dist has index.html and .htaccess SPA fallback')
