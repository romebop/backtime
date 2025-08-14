import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    minify: mode === 'production'
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/data': 'http://localhost:3000',
      '/gmail': 'http://localhost:3000',
      '/gemini': 'http://localhost:3000',
    }
  }
}))