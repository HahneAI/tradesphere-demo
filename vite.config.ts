import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        includeAssets: [
          env.VITE_PWA_FAVICON || 'favicon.ico',
          env.VITE_PWA_APPLE_ICON || 'apple-touch-icon.png',
          'logo.svg'
        ],
        manifest: {
          name: env.VITE_PWA_NAME || 'TradeSphere',
          short_name: env.VITE_PWA_SHORT_NAME || 'TradeSphere',
          description: env.VITE_PWA_DESCRIPTION || 'A revolutionary pricing tool for the trade industry.',
          theme_color: '#ffffff',
          icons: [
            {
              src: env.VITE_PWA_ICON_192 || 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: env.VITE_PWA_ICON_512 || 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/.netlify\/functions\/chat-messages\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
          navigateFallback: 'offline.html',
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});