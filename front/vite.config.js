import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Vite normally lets existing process.env override .env files. If VITE_API_URL is set in the OS
// (e.g. to http://localhost:8000), it would ignore front/.env — define from loadEnv() so .env wins.
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const devProxyTarget =
    fileEnv.DEV_API_PROXY_TARGET || 'https://back.crm-amazonltd.online'

  return {
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
  }
})
