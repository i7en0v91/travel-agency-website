import { joinURL } from 'ufo';
import { AvailableLocaleCodes } from './shared/constants';
import { TEST_SERVER_PORT } from './shared/testing/common';

const listLocalizedPaths = (enPath: string) => [enPath.startsWith('/') ? enPath : `/${enPath}`, ...AvailableLocaleCodes.filter(l => l !== 'en').map(l => joinURL(`/${l}`, `${enPath}`))];

export default defineNuxtConfig({
  devtools: { enabled: false },
  sourcemap: {
    server: true,
    client: true
  },
  sitemap: {
    autoLastmod: false,
    exclude: [
      ...listLocalizedPaths('/account')
    ]
  },
  features: {
    inlineStyles: false
  },
  experimental: {
    renderJsonPayloads: false
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],
  app: {
    head: {
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },
  auth: {
    baseURL: 'http://localhost:3000/api/auth'
  },
  i18n: {
    vueI18n: './i18n.config.ts',
    langDir: './locales',
    locales: [
      { code: 'en', name: 'English', iso: 'en-US', file: 'en.json' },
      { code: 'fr', name: 'Français', iso: 'fr-FR', file: 'fr.json' },
      { code: 'ru', name: 'Русский', iso: 'ru-RU', file: 'ru.json' }
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    compilation: {
      strictMessage: false
    }
  },
  site: {
    url: 'http://localhost:3000',
    name: 'Test website (dev)',
    description: 'Test (dev)',
    defaultLocale: 'en',
    identity: {
      type: 'Person'
    },
    email: 'support@golobe.demo'
  },
  googleFonts: {
    download: true,
    base64: false,
    outputDir: '~/assets/fonts',
    stylePath: 'css/fonts.css',
    subsets: ['Cyrillic', 'Latin'],
    families: {
      Montserrat: [400, 500, 600, 700],
      Raleway: [400, 500, 600, 700]
    }
  },
  dayjs: {
    plugins: ['relativeTime', 'utc', 'timezone', 'localizedFormat'],
    defaultLocale: 'en'
  },
  image: {
    providers: {
      entity: {
        provider: '~/shared/entityImageProvider'
      }
    }
  },
  router: {
    options: {
      scrollBehaviorType: 'smooth'
    }
  },
  modules: [
    ['@nuxtjs/google-fonts', {}],
    ['@nuxtjs/i18n', {}],
    ['@sidebase/nuxt-auth', {}],
    ['@nuxt/image', {}],
    ['dayjs-nuxt', {}],
    ['@nuxtseo/module', {}],
    ['nuxt-lazy-hydrate', {}],
    ['@pinia/nuxt', {}],
    ['floating-vue/nuxt', {}],
    ['nuxt-swiper', {}],
    ['@samk-dev/nuxt-vcalendar', {}],
    ['@nuxt/test-utils/module', {}]
    // ['@unlighthouse/nuxt', {}] // triggering run via npm scripts, see package.json
  ],
  css: ['vue-final-modal/style.css'],
  build: {
    transpile: ['jsonwebtoken']
  },
  $development: {
    vite: {
      optimizeDeps: {
        exclude: ['server-logic']
      }
    }
  },
  $test: {
    vite: {
      optimizeDeps: {
        exclude: ['server-logic']
      }
    },
    build: {
      transpile: ['vue-toastification']
    },
    auth: {
      baseURL: `http://127.0.0.1:${TEST_SERVER_PORT}/api/auth`
    },
    site: {
      url: `http://localhost:${TEST_SERVER_PORT}`,
      name: 'Golobe',
      description: 'Travel Agency Demo Website (Test)',
      defaultLocale: 'en',
      identity: {
        type: 'Person'
      },
      email: 'support@golobe.demo'
    },
    nitro: {
      rollupConfig: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('sidebase/nuxt-auth')) {
              return 'sidebase-nuxt-auth';
            }
          }
        }
      }
    }
  },
  /** Production overrides */
  $production: {
    build: {
      transpile: ['lodash', 'vue-toastification']
    },
    auth: {
      baseURL: process.env.PUBLISH ? 'https://golobe.demo/api/auth' : 'http://localhost:3000/api/auth'
    },
    site: {
      url: process.env.PUBLISH ? 'https://golobe.demo' : 'http://localhost:3000',
      name: 'Golobe',
      description: 'Travel Agency Demo Website',
      defaultLocale: 'en',
      identity: {
        type: 'Person'
      },
      email: 'support@golobe.demo'
    },
    routeRules: {
      // at the moment - Nuxt 3.7.4 - this route rules works only for production mode; cannot get it work in dev
      '/img/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } },
      '/_ipx/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } },
      '/js/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } },
      '/geo/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } }
    },
    nitro: {
      compressPublicAssets: {
        gzip: true
      },
      rollupConfig: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('sidebase/nuxt-auth')) {
              return 'sidebase-nuxt-auth';
            }
          }
        }
      }
    },
    vite: {
      build: {
        terserOptions: {
          compress: {
            drop_console: true
          }
        },
        minify: 'terser',
        sourcemap: 'hidden'
      }
    }
  }
});
