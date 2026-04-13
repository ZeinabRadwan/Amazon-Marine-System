import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Directory that contains this config and front/.env* (not process.cwd(), which may be the monorepo root).
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// Vite normally lets existing process.env override .env files. If VITE_API_URL is set in the OS
// (e.g. to http://localhost:8000), it would ignore front/.env — define from loadEnv() so .env wins.
function viteBaseFromEnv(raw) {
  const p = (raw ?? '').trim()
  if (!p || p === '/') {
    return '/'
  }
  const withLead = p.startsWith('/') ? p : `/${p}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, __dirname, '')
  const devProxyTarget =
    fileEnv.DEV_API_PROXY_TARGET || 'https://back.crm-amazonltd.live/'
  const base = viteBaseFromEnv(fileEnv.VITE_BASE_PATH)

  return {
    root: __dirname,
    envDir: __dirname,
    base,
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(fileEnv.VITE_API_URL ?? ''),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(fileEnv.VITE_API_BASE_URL ?? ''),
    },
    // Browser → same origin (localhost:5173) → Vite proxies /api → remote API (avoids CORS during dev)
    // secure: false — some hosts use a cert that does not match the domain; Node would reject TLS and the proxy can fail (often as 500).
    server: {
      proxy: {
        '^/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        '^/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.js',
      include: ['src/tests/**/*.test.{js,jsx}'],
    },
  }
})
