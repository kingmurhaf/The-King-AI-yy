import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ⬇️ غيّر هذا إلى اسم مستودعك على GitHub
const REPO_NAME = 'king-ai'
const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['crown.svg', 'crown-192.png', 'crown-512.png', 'favicon.ico'],
      injectRegister: 'auto',
      manifest: {
        name: 'The King AI - مساعدك الذكي',
        short_name: 'King AI',
        description: 'مساعدك الذكي العربي - تطبيق يعمل بدون إنترنت',
        theme_color: '#080b14',
        background_color: '#080b14',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        categories: ['productivity', 'utilities'],
        screenshots: [
          { src: 'crown-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'crown-512.png', sizes: '512x512', type: 'image/png' }
        ],
        icons: [
          { src: 'crown-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'crown-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'crown-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'crown-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/(api\.duckduckgo\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: isDev,
        navigateFallbackAllowlist: [/^(?!\/__)/]
      }
    })
  ],
  publicDir: isDev ? 'public' : '.',
  base: isDev ? '/' : `/${REPO_NAME}/`,
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
