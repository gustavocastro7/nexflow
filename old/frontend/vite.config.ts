/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const target = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3100'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8085,
    host: true,
    allowedHosts: ['.ngrok-free.app'],
    hmr: {
      
    },
    proxy: {
      '/api': target,
      '/api-docs': target,
    }
  },
})
