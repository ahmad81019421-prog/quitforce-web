import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'dom-helpers/addClass': path.resolve(
        __dirname,
        'node_modules/dom-helpers/esm/addClass.js'
      ),
      'dom-helpers/removeClass': path.resolve(
        __dirname,
        'node_modules/dom-helpers/esm/removeClass.js'
      )
    }
  },
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split big vendor chunks so the initial app load stays lean.
          // Lazy-loaded routes then pull these in parallel as needed.
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/messaging'
          ],
          charts: ['recharts'],
          motion: ['framer-motion'],
          icons: ['lucide-react']
        }
      }
    }
  }
})
