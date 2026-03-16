import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    minify: mode === 'production'
  },
  resolve: {
    alias: {
      '@backtime/sync-engine': path.resolve(__dirname, '../../packages/sync-engine/src/index.ts'),
      '@backtime/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  server: {
    watch: {
      // Watch workspace packages for hot reload
      ignored: ['!**/packages/**'],
    },
  },
}))
