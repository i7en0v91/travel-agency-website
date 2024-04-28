import { joinURL } from 'ufo';
import { type RollupLog, type LogLevel, type LogOrStringHandler } from 'rollup';
import { AvailableLocaleCodes, PagePath, EntityIdPages, ApiEndpointUserAccount, ApiEndpointPrefix, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets, HeaderVaryRenderCache, CookieI18nLocale, DefaultLocale } from './shared/constants';
import { TEST_SERVER_PORT } from './shared/testing/common';
import AppConfig from './appconfig';
import toPairs from 'lodash-es/toPairs';
import fromPairs from 'lodash-es/fromPairs';
import flatten from 'lodash-es/flatten';
import { type NitroRouteConfig } from 'nitropack';

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

// html pages caching rules
const SwrCachingRouteRule: NitroRouteConfig = { 
  cache: AppConfig.caching.htmlPageCachingSeconds ? { maxAge: AppConfig.caching.htmlPageCachingSeconds, staleMaxAge: -1 } : false,
  auth: {
    disableServerSideAuth: true
  }
} as any;
const CachingDisabledRouteRule: NitroRouteConfig = { swr: false };
const HtmlPageCachingRules: { [P in PagePath]: NitroRouteConfig } = {
  '': SwrCachingRouteRule,
  'signup': SwrCachingRouteRule,
  'forgot-password': SwrCachingRouteRule,
  'find-flights': SwrCachingRouteRule,
  'find-stays': SwrCachingRouteRule,
  'flight-details': SwrCachingRouteRule,
  'flight-book': SwrCachingRouteRule,
  'flights': SwrCachingRouteRule,
  'login': SwrCachingRouteRule,
  'privacy': SwrCachingRouteRule,
  'stays': SwrCachingRouteRule,
  'stay-details': SwrCachingRouteRule,
  'stay-book': SwrCachingRouteRule,
  'account': CachingDisabledRouteRule,
  'favourites': CachingDisabledRouteRule,
  'booking': { swr: false, cache: { name: 'no-store', maxAge: 0, varies: [HeaderVaryRenderCache] }, robots: false },
  'signup-verify': CachingDisabledRouteRule,
  'signup-complete': CachingDisabledRouteRule,
  'forgot-password-verify': CachingDisabledRouteRule,
  'forgot-password-complete': CachingDisabledRouteRule,
  'forgot-password-set': CachingDisabledRouteRule,
  'email-verify-complete': CachingDisabledRouteRule
};
const UserRelatedApiRoutes = [`${ApiEndpointPrefix}/booking/**`, ApiEndpointUserAccount, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets];

export default defineNuxtConfig({
  devtools: { enabled: false },
  sourcemap: {
    server: true,
    client: true
  },
  sitemap: {
    autoLastmod: false,
    exclude: [
      ...listLocalizedPaths(`/${PagePath.Account}`),
      ...listLocalizedPaths(`/${PagePath.Favourites}`),
      ...listLocalizedPaths(`/${PagePath.EmailVerifyComplete}`),
      ...listLocalizedPaths(`/${PagePath.ForgotPasswordComplete}`),
      ...listLocalizedPaths(`/${PagePath.ForgotPasswordSet}`),
      ...listLocalizedPaths(`/${PagePath.ForgotPasswordVerify}`),
      ...listLocalizedPaths(`/${PagePath.SignupComplete}`),
      ...listLocalizedPaths(`/${PagePath.SignupVerify}`),
      ...listLocalizedPaths(`/${PagePath.BookingDetails}/**`),
    ]
  },
  features: {
    inlineStyles: false,
    devLogs: 'silent'
  },
  experimental: {
    renderJsonPayloads: false,
    clientNodeCompat: true
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
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: CookieI18nLocale,
      alwaysRedirect: true,
      fallbackLocale: DefaultLocale,
      redirectOn: 'root' // recommended
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
    subsets: ['cyrillic', 'latin'],
    families: {
      Montserrat: [400, 500, 600, 700],
      'Spectral+SC': [300]
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
      cacheMaxAgeSeconds: 24 * 60 * 60
    },
    runtimeCacheStorage: true,
    componentDirs: ['og-image', 'og-image-template'],
    fonts: [
      'Montserrat:500',
      'Montserrat:600',
      'Montserrat:700',
      {
        name: 'Spectral SC',
        weight: 300,
        path: '/fonts/Spectral_SC-300.ttf' // nuxt-og-image^3.0.0-rc.52 - warn woff2 not supported
      }
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
  routeRules: {
    ...(fromPairs(flatten(toPairs(HtmlPageCachingRules).map(rr => listLocalizedPaths(`/${rr[0]}`).map(lp => [EntityIdPages.some(idp => lp.includes(idp)) ? `${lp}/**` : lp, rr[1]]))))),
    ...(fromPairs((UserRelatedApiRoutes.map(ur => [ur, { cache: false, swr: false, headers: { 'cache-control': 'no-store' } }])))),
    '/__og-image__/image/**': { cache: { swr: false, varies: ['Host', HeaderVaryRenderCache], headersOnly: true }, headers: { 'cache-control': 'no-store' }, robots: false },
    '/api/img/**': { headers:  AppConfig.caching.htmlPageCachingSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.htmlPageCachingSeconds},s-maxage=${AppConfig.caching.htmlPageCachingSeconds}` } : { 'cache-control': 'no-cache' } },
    '/_ipx/**': { headers:  AppConfig.caching.htmlPageCachingSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.htmlPageCachingSeconds},s-maxage=${AppConfig.caching.htmlPageCachingSeconds}` } : { 'cache-control': 'no-cache' } },
    '/js/**': { headers:  AppConfig.caching.htmlPageCachingSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.htmlPageCachingSeconds},s-maxage=${AppConfig.caching.htmlPageCachingSeconds}` } : { 'cache-control': 'no-cache' } }
  },
  nitro: {
    publicAssets: [
      {
        baseURL: '/appdata',
        dir: './../assets/appdata',
        maxAge: AppConfig.caching.htmlPageCachingSeconds ? AppConfig.caching.htmlPageCachingSeconds : 0
      }
    ],
    serverAssets: [{
      baseName: 'appdata',
      dir: './../assets/appdata'
    },
    {
      baseName: 'pdf-fonts',
      dir: './../assets/fonts/pdf'
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
    // ['@unlighthouse/nuxt', {}] // triggering run via npm scripts, see package.json
    ['nuxt-tiptap-editor', {}],
    ['@nuxt/eslint', {}]
  ],
  css: ['vue-final-modal/style.css'],
  build: {
    transpile: ['jsonwebtoken']
  },
  $development: {
    imports: {
      imports: [
        // needed for pdfkit
        { name: 'Blob', from: 'node:buffer' },
        { name: 'Buffer', from: 'node:buffer' }
      ]
    },
    vite: {
      optimizeDeps: {
        exclude: ['server-logic']
      }
    }
  },
  $test: {
    ogImage: {
      enabled: false
    },
    experimental: {
      renderJsonPayloads: false,
      clientNodeCompat: false // disable in Nuxt 3.11.2 - test run hangs on startup
    },
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
      transpile: ['lodash', 'vue-toastification', 'file-saver']
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
        },
        onLog: rollupLogHandler
      }
    }
  },
  /** Production overrides */
  $production: {
    build: {
      transpile: ['lodash', 'vue-toastification', 'file-saver']
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
    imports: {
      imports: [
        // needed for pdfkit
        { name: 'Blob', from: 'node:buffer' },
        { name: 'Buffer', from: 'node:buffer' }
      ]
    },
    nitro: {
      compressPublicAssets: {
        gzip: !process.env.PUBLISH
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