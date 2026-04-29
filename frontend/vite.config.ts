/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sprint 4 will replace this with a proper workbox config + real icons.
      // For v0.2, this just confirms the plugin pipeline runs.
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Wellbeing Check-In',
        short_name: 'Wellbeing',
        description: 'Privacy-first wellbeing pulse for medical ward staff',
        theme_color: '#0F172A',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      // Forward /api/* to the Flask backend during dev so we don't fight CORS locally.
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
