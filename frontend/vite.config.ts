/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8085,
    host: true,
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api-config': target,
      '/auth': target,
      '/users': target,
      '/roles': target,
      '/workspaces': target,
      '/security': target,
      '/cost-centers': target,
      '/invoices': target,
      '/reports': target,
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
