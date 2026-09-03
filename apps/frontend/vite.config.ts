import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const sharedSrc = path.resolve(rootDir, '../../libs/shared/src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app/shared': sharedSrc,
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [rootDir, sharedSrc, path.resolve(rootDir, '../..')],
    },
    proxy: {
      // Dev: /api/* → gateway :3000 — tránh CORS khi quên enableCors
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
