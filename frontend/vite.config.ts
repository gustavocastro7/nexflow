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
    hmr: {
      clientPort: 8086,
    },
    proxy: {
      '/api': target,
      '/api-docs': target,
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
