import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// the project's single .env lives one level up, at the repo root
const envDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const port = Number(loadEnv(mode, envDir, '').WEB_PORT) || 3000
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // must match FRONTEND_URL in .env (CORS, Google sign-in and reset links point there)
    server: { port, strictPort: true, host: 'localhost' },
    preview: { port, strictPort: true, host: 'localhost' },
  }
})
