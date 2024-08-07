import { joinURL } from 'ufo';
import { type RollupLog, type LogLevel, type LogOrStringHandler } from 'rollup';
import { ApiEndpointPrefix, ApiEndpointAuthentication, LoadingStubFileName, AvailableLocaleCodes, ApiEndpointUserAccount, ApiAppEndpointPrefix, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets, CookieI18nLocale, DefaultLocale, isTestEnv, isPublishEnv } from './shared/constants';
import { SystemPage, AppPage, EntityIdPages, getPagePath } from './shared/page-query-params';
import { TEST_SERVER_PORT } from './shared/testing/common';
import AppConfig, { AcsysModuleOptions } from './appconfig';
import toPairs from 'lodash-es/toPairs';
import fromPairs from 'lodash-es/fromPairs';
import flatten from 'lodash-es/flatten';
import { type NitroRouteConfig } from 'nitropack';
import { lookupValueOrThrow } from './shared/common';
import { join, resolve } from 'pathe';
import { writeFile } from 'fs/promises';

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
  cache: AppConfig.caching.intervalSeconds ? 
    { 
      maxAge:  !isTestEnv() ? AppConfig.caching.intervalSeconds : 0, /** only SWR is tested in e2e */
      staleMaxAge: -1
    } : false
} as any;
const CachingDisabledRouteRule: NitroRouteConfig = { swr: false, cache: false, headers: { 'cache-control': 'no-store' } };

const getRouteCachingRule = (cachingEnabled: boolean, /*unauthenticatedOnly*/ _: boolean): NitroRouteConfig => {
  const rule = cachingEnabled ? SwrCachingRouteRule : CachingDisabledRouteRule;
  /* TODO
  // KB: nuxt-auth 0.8.0 - set disableServerSideAuth to false for pages with { unauthenticatedOnly: true } to prevent redirect to login page
  const disableServerSideAuth = !unauthenticatedOnly;
  rule.auth = (rule.auth ?? { disableServerSideAuth });
  rule.auth.disableServerSideAuth = disableServerSideAuth;
  */
  return rule;
};

const HtmlPageCachingRules: { [P in AppPage]: NitroRouteConfig } & { [P in SystemPage]: NitroRouteConfig } = {
  'Index': getRouteCachingRule(true, false),
  'Signup': getRouteCachingRule(false, true),
  'ForgotPassword': getRouteCachingRule(false, true),
  'FindFlights': getRouteCachingRule(false, false),
  'FindStays': getRouteCachingRule(false, false),
  'FlightDetails': getRouteCachingRule(true, false),
  'BookFlight': getRouteCachingRule(true, false),
  'Flights': getRouteCachingRule(true, false),
  'Login': getRouteCachingRule(false, true),
  'Privacy': !isTestEnv() ? getRouteCachingRule(true, false) : { cache: { staleMaxAge: -1 } },
  'Stays': getRouteCachingRule(true, false),
  'StayDetails': getRouteCachingRule(true, false),
  'BookStay': getRouteCachingRule(true, false),
  'Account': { ...getRouteCachingRule(false, false), robots: false },
  'Favourites': { ...getRouteCachingRule(false, false), robots: false },
  'BookingDetails': { ...getRouteCachingRule(false, false), robots: false },
  'SignupVerify': getRouteCachingRule(false, true),
  'SignupComplete': getRouteCachingRule(false, true),
  'ForgotPasswordVerify': getRouteCachingRule(false, true),
  'ForgotPasswordComplete': getRouteCachingRule(false, true),
  'ForgotPasswordSet': getRouteCachingRule(false, true),
  'EmailVerifyComplete': getRouteCachingRule(false, true),
  'Drafts': getRouteCachingRule(false, false)
};
const ApiRoutesWithCachingDisabled = [`${ApiAppEndpointPrefix}/stays/**`, `${ApiAppEndpointPrefix}/booking/**`, ApiEndpointUserAccount, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets];

export default defineNuxtConfig({
  devtools: { enabled: false },

  ssr: true,

  sourcemap: {
    server: true,
    client: true
  },

  sitemap: {
    autoLastmod: false,
    exclude: isPublishEnv() ?
     [
      ...listLocalizedPaths(`/${getPagePath(AppPage.Account)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.Favourites)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.EmailVerifyComplete)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.ForgotPasswordComplete)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.ForgotPasswordSet)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.ForgotPasswordVerify)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.SignupComplete)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.SignupVerify)}`),
      ...listLocalizedPaths(`/${getPagePath(AppPage.BookingDetails)}/**`),
      ...listLocalizedPaths(`/${getPagePath(SystemPage.Drafts)}`),
     ] : undefined
  },

  features: {
    inlineStyles: (id?: string) => (id?.includes('components/og-image') ?? false),
    devLogs: 'silent'
  },

  experimental: {
    renderJsonPayloads: false,
    clientNodeCompat: true
  },

  plugins: [
    {
      name: 'backend-acsys.server',
      mode: 'server',
      order: 1,
      src: '~/plugins/backend-acsys.server.ts'
    },
    {
      name: 'backend-prisma.server',
      mode: 'server',
      order: 2,
      src: '~/plugins/backend-prisma.server.ts'
    },
    {
      name: 'error-page-handler.server',
      mode: 'server',
      order: 3,
      src: '~/plugins/error-page-handler.server.ts'
    },
    {
      name: 'logging-hooks',
      mode: 'all',
      order: 4,
      src: '~/plugins/logging-hooks.ts'
    },
    {
      name: 'data-seed.server',
      mode: 'server',
      order: 5,
      src: '~/plugins/data-seed.server.ts'
    },
    {
      name: 'startup.server',
      mode: 'server',
      order: 6,
      src: '~/plugins/startup.server.ts'
    },
    {
      name: 'startup.client',
      mode: 'client',
      order: 1,
      src: '~/plugins/startup.client.ts'
    },
    {
      name: 'custom-fetch',
      mode: 'all',
      order: 7,
      src: '~/plugins/custom-fetch.ts'
    },
    {
      name: 'floating-vue',
      mode: 'all',
      order: 8,
      src: '~/plugins/floating-vue.ts'
    },
    {
      name: 'vue-yandex-maps.client',
      mode: 'client',
      order: 9,
      src: '~/plugins/vue-yandex-maps.client.ts'
    },
    {
      name: 'cacheable-page',
      mode: 'server',
      order: 10,
      src: '~/plugins/cacheable-page.ts'
    },
    {
      name: 'vue-final-modal',
      mode: 'all',
      order: 11,
      src: '~/plugins/vue-final-modal.ts'
    }
  ],

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
    baseURL: `http://localhost:3000/${ApiEndpointPrefix}/auth`
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

  acsys: AcsysModuleOptions,

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
    ...(fromPairs(flatten(toPairs(HtmlPageCachingRules).map(rr => listLocalizedPaths(`/${getPagePath(lookupValueOrThrow({ ...AppPage, ...SystemPage }, rr[0]))}`).map(lp => [EntityIdPages.some(idp => lp.includes(getPagePath(idp))) ? `${lp}/**` : lp, rr[1]]))))),
    ...(fromPairs((ApiRoutesWithCachingDisabled.map(ur => [ur, { cache: false, headers: { 'cache-control': 'no-store' } }])))),
    '/api/app/img/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/_ipx/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/js/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/api/app/testing/**': !isTestEnv() ? { redirect: '/' } : {}
  },

  nitro: {
    publicAssets: [
      {
        baseURL: '/appdata',
        dir: './../assets/appdata',
        maxAge: AppConfig.caching.intervalSeconds ? AppConfig.caching.intervalSeconds : 0
      }
    ],
    serverAssets: [{
      baseName: 'appdata',
      dir: './../assets/appdata'
    },
    {
      baseName: 'pdf-fonts',
      dir: './../assets/fonts/pdf'
    },
    {
      baseName: 'templates',
      dir: './../assets/templates'
    }]
  },

  modules: [
    ['@nuxtjs/google-fonts', {}],
    ['@nuxtjs/i18n', {}],
    ['@sidebase/nuxt-auth', {}],
    ['@nuxt/image', {}],
    ['dayjs-nuxt', {}],
    ['@nuxtjs/seo', {}],
    ['@pinia/nuxt', {}],
    ['floating-vue/nuxt', {}],
    ['nuxt-swiper', {}],
    ['@samk-dev/nuxt-vcalendar', {}],
    ['@nuxt/test-utils/module', {}],
    ['nuxt-tiptap-editor', {}],
    ['@nuxt/eslint', {}]
  ],

  css: ['vue-final-modal/style.css'],

  build: {
    transpile: ['jsonwebtoken']
  },

  hooks: AppConfig.customLoadingStub ? {
    'ready': async (nuxt) => {
      const loadingTemplate = nuxt.options.devServer.loadingTemplate({ loading: 'Seeding database & loading' });
      const templateFile = resolve(join('assets', 'templates', LoadingStubFileName));
      await writeFile(templateFile, loadingTemplate);
    }
  } : undefined,

  $development: {
    imports: {
      imports: [
        // needed for pdfkit
        { name: 'Blob', from: 'node:buffer' },
        { name: 'Buffer', from: 'node:buffer' }
      ]
    }
  },

  $test: {
    experimental: {
      renderJsonPayloads: false,
      clientNodeCompat: false // disable in Nuxt 3.11.2 - test run hangs on startup
    },
    vite: {
      build: {
        rollupOptions: {
          onLog: rollupLogHandler
        },
        chunkSizeWarningLimit: 1000
      }
    },
    build: {
      transpile: ['lodash', 'vue-toastification', 'file-saver']
    },
    auth: {
      baseURL: `http://127.0.0.1:${TEST_SERVER_PORT}/${ApiEndpointAuthentication}`
    },
    site: {
      url: `http://127.0.0.1:${TEST_SERVER_PORT}`,
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
      baseURL: isPublishEnv() ? `https://golobe.demo/${ApiEndpointAuthentication}` : `http://localhost:3000/${ApiEndpointAuthentication}`
    },
    site: {
      url: isPublishEnv() ? 'https://golobe.demo' : 'http://localhost:3000',
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
        gzip: !isPublishEnv()
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
        chunkSizeWarningLimit: 1000,
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
  },

  compatibilityDate: '2024-07-05'
});