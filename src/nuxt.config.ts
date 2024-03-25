import { joinURL } from 'ufo';
import { type RollupLog, type LogLevel, type LogOrStringHandler } from 'rollup';
import { AvailableLocaleCodes, PagePath } from './shared/constants';
import { TEST_SERVER_PORT } from './shared/testing/common';
import AppConfig from './appconfig';

const listLocalizedPaths = (enPath: string) => [enPath.startsWith('/') ? enPath : `/${enPath}`, ...AvailableLocaleCodes.filter(l => l !== 'en').map(l => joinURL(`/${l}`, `${enPath}`))];
const rollupLogHandler = (
  level: LogLevel,
  log: RollupLog,
  defaultHandler: LogOrStringHandler
) => {
  if (log.code === 'CIRCULAR_DEPENDENCY') {
    return; // Ignore circular dependency warnings
  }
  defaultHandler(level, log);
};

export default defineNuxtConfig({
  devtools: { enabled: false },
  sourcemap: {
    server: true,
    client: true
  },
  sitemap: {
    autoLastmod: false,
    exclude: [
      ...listLocalizedPaths(`/${PagePath.Account}`)
    ]
  },
  features: {
    inlineStyles: false,
    devLogs: 'silent'
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
    email: 'support@demo.golobe'
  },
  googleFonts: {
    download: true,
    base64: false,
    outputDir: '~/assets/fonts',
    stylePath: 'css/fonts.css',
    subsets: ['cyrillic', 'latin'],
    families: {
      Montserrat: [400, 500, 600, 700]
    }
  },
  dayjs: {
    plugins: ['relativeTime', 'utc', 'timezone', 'localizedFormat'],
    defaultLocale: 'en'
  },
  ogImage: {
    defaults: {
      width: AppConfig.ogImage.screenSize.width,
      height: AppConfig.ogImage.screenSize.height,
      cacheMaxAgeSeconds: 60 * 60 * 24
    },
    componentDirs: ['og-image', 'og-image-template'],
    fonts: [
      'Montserrat:500',
      'Montserrat:700'
    ]
  },
  tiptap: {
    prefix: 'Tiptap'
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
  nitro: {
    publicAssets: [
      {
        baseURL: '/appdata',
        dir: './../assets/appdata',
        maxAge: 60 * 60 * 24 * 7
      }
    ],
    serverAssets: [{
      baseName: 'appdata',
      dir: './../assets/appdata'
    }]
  },
  modules: [
    ['@nuxtjs/google-fonts', {}],
    ['@nuxtjs/i18n', {}],
    ['@sidebase/nuxt-auth', {}],
    ['@nuxt/image', {}],
    ['dayjs-nuxt', {}],
    ['@nuxtjs/seo', {}],
    ['nuxt-lazy-hydrate', {}],
    ['@pinia/nuxt', {}],
    ['floating-vue/nuxt', {}],
    ['nuxt-swiper', {}],
    ['@samk-dev/nuxt-vcalendar', {}],
    ['@nuxt/test-utils/module', {}],
    ['nuxt-tiptap-editor', {}]
    // ['@unlighthouse/nuxt', {}] // triggering run via npm scripts, see package.json
  ],
  css: ['vue-final-modal/style.css'],
  build: {
    transpile: ['jsonwebtoken']
  },
  vite: {
    $client: {
      build: {
        rollupOptions: {
          output: !process.env.PUBLISH
            ? {
                chunkFileNames: '_nuxt/[name].[hash].js',
                entryFileNames: '_nuxt/[name].[hash].js'
              }
            : undefined
        }
      }
    }
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
      },
      build: {
        rollupOptions: {
          onLog: rollupLogHandler
        }
      }
    },
    build: {
      transpile: ['lodash', 'vue-toastification']
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
      email: 'support@demo.golobe'
    },
    nitro: {
      rollupConfig: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('sidebase/nuxt-auth')) {
              return 'sidebase-nuxt-auth';
            }
          }
        },
        onLog: rollupLogHandler
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
      email: 'support@demo.golobe'
    },
    routeRules: {
      // at the moment - Nuxt 3.7.4 - this route rules works only for production mode; cannot get it work in dev
      '/img/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } },
      '/_ipx/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } },
      '/js/**': { headers: { 'cache-control': `public,max-age=${24 * 60 * 60},s-maxage=${24 * 60 * 60}` } }
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
        },
        onLog: rollupLogHandler
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
        sourcemap: 'hidden',
        rollupOptions: {
          onLog: rollupLogHandler
        }
      }
    }
  }
});
