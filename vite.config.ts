import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { brandingConfig } from './src/config/branding';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        includeAssets: [
          env.VITE_PWA_FAVICON || brandingConfig.pwa.favicon,
          env.VITE_PWA_APPLE_ICON || brandingConfig.pwa.appleIcon,
          'logo.svg'
        ],
        manifest: {
          name: env.VITE_PWA_NAME || brandingConfig.pwa.name,
          short_name: env.VITE_PWA_SHORT_NAME || brandingConfig.pwa.shortName,
          description: env.VITE_PWA_DESCRIPTION || brandingConfig.pwa.description,
          theme_color: '#ffffff',
          icons: [
            {
              src: env.VITE_PWA_ICON_192 || brandingConfig.pwa.icon192,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: env.VITE_PWA_ICON_512 || brandingConfig.pwa.icon512,
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
    build: {
      target: 'esnext', // Support import.meta
      rollupOptions: {
        // Google APIs removed - using internal master formula calculations
        // external: [
        //   'google-auth-library',
        //   'googleapis'
        // ],
        output: {
          format: 'es', // Use ES modules format for import.meta support
          // Google API globals removed - fully self-contained system
          // globals: {
          //   'google-auth-library': 'GoogleAuth',
          //   'googleapis': 'googleapis'
          // }
        }
      }
    }
  };
});