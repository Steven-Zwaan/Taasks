// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
  ],

  // Alias for shared folder
  alias: {
    '#shared': resolve(__dirname, './shared'),
  },

  // Runtime config for Auth0
  runtimeConfig: {
    auth0: {
      domain: process.env.NUXT_AUTH0_DOMAIN || '',
      clientId: process.env.NUXT_AUTH0_CLIENT_ID || '',
      clientSecret: process.env.NUXT_AUTH0_CLIENT_SECRET || '',
      audience: process.env.NUXT_AUTH0_AUDIENCE || '',
    },
    public: {
      auth0: {
        domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN || '',
        clientId: process.env.NUXT_PUBLIC_AUTH0_CLIENT_ID || '',
        audience: process.env.NUXT_PUBLIC_AUTH0_AUDIENCE || '',
      },
    },
  },

  // App configuration with iOS PWA meta tags
  app: {
    head: {
      title: 'Todo App',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no',
      meta: [
        { name: 'description', content: 'Offline-first Todo App with sync' },
        { name: 'theme-color', content: '#ffffff' },
        // iOS PWA meta tags
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Todos' },
        // Prevent phone number detection
        { name: 'format-detection', content: 'telephone=no' },
        // PWA safe area
        { name: 'mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        // iOS Splash Screens
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1170-2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1179-2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1290-2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1284-2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1242-2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-828-1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-1125-2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
        { rel: 'apple-touch-startup-image', href: '/splash/apple-splash-750-1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      ],
    },
  },

  // PWA configuration
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Todo App',
      short_name: 'Todos',
      description: 'Offline-first Todo Application with sync',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        {
          src: '/pwa-192x192.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
        },
        {
          src: '/pwa-512x512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
        },
        {
          src: '/pwa-512x512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      // Pre-cache all static assets including icons
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2,ttf,eot,webp,jpg,jpeg,gif}'],
      // Runtime caching strategies
      runtimeCaching: [
        // Cache static assets with CacheFirst (icons, images, fonts)
        {
          urlPattern: /\.(?:png|svg|ico|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-assets',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache favicon specifically
        {
          urlPattern: /favicon\.ico$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'favicon-cache',
            expiration: {
              maxEntries: 1,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache apple touch icons
        {
          urlPattern: /apple-touch-icon.*\.png$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'apple-icons',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache splash screens
        {
          urlPattern: /\/splash\/.*\.png$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'splash-screens',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache CSS/JS with StaleWhileRevalidate
        {
          urlPattern: /\.(?:js|css)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Auth0 - NetworkFirst with fallback
        {
          urlPattern: /^https:\/\/.*\.auth0\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'auth0-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24, // 1 day
            },
            networkTimeoutSeconds: 10,
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // API - NetworkFirst with short timeout for offline
        {
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
            },
            networkTimeoutSeconds: 5,
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Google Fonts
        {
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
      // Ensure app shell works offline
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    devOptions: {
      enabled: false,
    },
  },

  // Tailwind configuration (cssPath handles injecting the CSS file)
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    exposeConfig: false,
  },

  // Vite configuration for CJS module compatibility
  vite: {
    optimizeDeps: {
      include: ['dexie'],
    },
    ssr: {
      noExternal: ['dexie'],
    },
  },
})
