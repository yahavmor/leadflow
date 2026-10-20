import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = process.env.API_URL || 'http://localhost:3030'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/socket.io': { target: API, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    css: false,
  },
})
