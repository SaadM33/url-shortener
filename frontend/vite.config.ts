import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const port = Number(process.env.PORT) || 3000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // the API's CORS and redirects expect the frontend at FRONTEND_URL (localhost:3000 by default);
  // if you change PORT here, set FRONTEND_URL in the backend's .env to match
  server: { port, strictPort: true, host: 'localhost' },
  preview: { port, strictPort: true, host: 'localhost' },
})
