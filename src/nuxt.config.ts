import { UseWinstonOnClient, I18LocalesDirName, lookupValueOrThrow, AppConfig, SystemPage, AppPage, EntityIdPages, getPagePath, AvailableLocaleCodes, CookieI18nLocale, DefaultLocale, isTestEnv, isPublishEnv, isDevEnv, isElectronBuild, LoadingStubFileName } from '@golobe-demo/shared';
import { ApiEndpointLoadOffers, ApiEndpointPrefix, ApiEndpointAuthentication, ApiEndpointUserAccount, ApiAppEndpointPrefix, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets } from './server/api-definitions';
import { resolveSharedPkgPath } from './helpers/resolvers';
import { joinURL } from 'ufo';
import type { RollupLog, LogLevel, LogOrStringHandler } from 'rollup';
import { TEST_SERVER_PORT } from './helpers/testing';
import toPairs from 'lodash-es/toPairs';
import fromPairs from 'lodash-es/fromPairs';
import flatten from 'lodash-es/flatten';
import type { NitroRouteConfig } from 'nitropack';
import { join, resolve, basename } from 'pathe';
import { writeFile } from 'fs/promises';
import { SharpDynamicLoaderPlugin } from './build-utils/sharp-dynamic-loader';
import { BuildConfig as WinstonClientBuildConfig } from './build-utils/winston-esm-client';

const listLocalizedPaths = (enPath: string) => [enPath.startsWith('/') ? enPath : `/${enPath}`, ...AvailableLocaleCodes.filter(l => l !== 'en').map(l => joinURL(`/${l}`, `${enPath}`))];
const rollupLogHandler = (
  level: LogLevel,
  log: RollupLog,
  defaultHandler: LogOrStringHandler
) => {
  if (log.code === 'CIRCULAR_DEPENDENCY') {
    return; // Ignore circular dependency warnings
  }
  if (log.code === 'UNUSED_EXTERNAL_IMPORT' && log.names?.length === 1 && log.names[0] === 'isError') {
    return; // Ignore unused "isError" is imported from external module warning in prerendering mode
  }
  defaultHandler(level, log);
};

// html pages caching rules
const SwrCachingRouteRule: NitroRouteConfig = { 
  cache: AppConfig.caching.intervalSeconds ? 
    { 
      maxAge:  !isTestEnv() ? AppConfig.caching.intervalSeconds : 0, /** testing server-side caching in e2e */
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

// align markdown caching to html page's cache duration
const NuxtContentCachingRule: NitroRouteConfig = getRouteCachingRule(true, false);

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
const ApiRoutesWithCachingDisabled = [`${ApiAppEndpointPrefix}/stays/**`, `${ApiAppEndpointPrefix}/booking/**`, ApiEndpointUserAccount, ApiEndpointUserFavourites, ApiEndpointUserImageUpload, ApiEndpointUserTickets, ApiEndpointLoadOffers];

const AcsysFilesGlobForWatchers = isDevEnv() ? 
  [`**/${basename(AppConfig.acsys.execDir)}/**`, `**/externals/${basename(AppConfig.acsys.srcDir)}/**`] : [];

export default defineNuxtConfig({
  devtools: { enabled: isDevEnv() && !isElectronBuild() },
  
  ssr: !isElectronBuild(),

  sourcemap: {
    server: true,
    client: true
  },

  sitemap: !isElectronBuild() ? {
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
  } : { enabled: false },

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
      name: 'error-page-handler.server',
      mode: 'server',
      order: 20,
      src: '~/plugins/error-page-handler.server.ts'
    },
    {
      name: 'logging-hooks',
      mode: 'all',
      order: 30,
      src: '~/plugins/logging-hooks.ts'
    },
    {
      name: 'startup.server',
      mode: 'server',
      order: 40,
      src: '~/plugins/startup.server.ts'
    },
    {
      name: 'startup.client',
      mode: 'client',
      order: 10,
      src: '~/plugins/startup.client.ts'
    },
    {
      name: 'pinia-plugins',
      mode: 'all',
      order: 45,
      src: '~/plugins/pinia-plugins.ts'
    },
    {
      name: 'custom-fetch',
      mode: 'all',
      order: 50,
      src: '~/plugins/custom-fetch.ts'
    },
    {
      name: 'vue-yandex-maps.client',
      mode: 'client',
      order: 70,
      src: '~/plugins/vue-yandex-maps.client.ts'
    },
    {
      name: 'cacheable-page',
      mode: 'server',
      order: 80,
      src: '~/plugins/cacheable-page.ts'
    }
  ],

  components: [
    {
      path: '~/components',
      pathPrefix: false
    },
    {
      path: '~/content/prose',
      pathPrefix: false,
      global: true
    },
    {
      path: '~/content/components',
      pathPrefix: false,
      global: true
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
    },
    ...(isElectronBuild() ? {
      baseURL: '/', //  './' fails when loading chunks from non-index page, see "Fix path to make it works with Electron protocol `file://`" comment at see https://github.com/caoxiemeihao/nuxt-electron/blob/main/src/index.ts
      buildAssetsDir: '/'
    } : {}),
  },

  auth: {
    baseURL: `http://localhost:3000/${ApiEndpointPrefix}/auth`
  },

  i18n: {
    vueI18n: './i18n.config.ts',
    langDir: I18LocalesDirName,
    locales: [
      { code: 'en', name: 'English', language: 'en-US', file: resolveSharedPkgPath('locales/en.json') },
      { code: 'fr', name: 'Français', language: 'fr-FR', file: resolveSharedPkgPath('locales/fr.json') },
      { code: 'ru', name: 'Русский', language: 'ru-RU', file: resolveSharedPkgPath('locales/ru.json') }
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

  ogImage: !isElectronBuild() ? {
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
        path: '/fonts/Spectral_SC-300.ttf'
      }
    ]
  } : { enabled: false },

  svgo: {
    autoImportPath: false,
  },

  content: {
    contentHead: false,
    highlight: false,
    ignores: [
      'content/prose',
      'content/components'
    ],
    experimental: {
      search: true,
      cacheContents: true
    }
  },

  ui: {
    safelistColors: ['mintgreen']
  },

  // @ts-expect-error electron enabled optionally
  electron: isElectronBuild() ? {
    disableDefaultOptions: true,
    build: [
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['sharp']
            }
          }
        }
      },
    ],
  } : undefined,

  tiptap: {
    prefix: 'Tiptap'
  },

  image: {
    providers: {
      entity: {
        provider: '~/client/entityImageProvider'
      }
    }
  },

  router: {
    options: {
      scrollBehaviorType: 'auto',
      hashMode: false, // also should be set to false for Electron, otherwise will fail opening windows for non-index page urls
      strict: false
    }
  },

  routeRules: {
    ...(fromPairs(flatten(toPairs(HtmlPageCachingRules).map(rr => listLocalizedPaths(`/${getPagePath(lookupValueOrThrow({ ...AppPage, ...SystemPage }, rr[0]))}`).map(lp => [EntityIdPages.some(idp => lp.includes(getPagePath(idp))) ? `${lp}/**` : lp, rr[1]]))))),
    ...(fromPairs((ApiRoutesWithCachingDisabled.map(ur => [ur, { cache: false, headers: { 'cache-control': 'no-store' } }])))),
    '/api/_content/query/**': NuxtContentCachingRule,
    '/api/app/img/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/_ipx/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/js/**': { headers:  AppConfig.caching.intervalSeconds ? { 'cache-control': `public,max-age=${AppConfig.caching.intervalSeconds},s-maxage=${AppConfig.caching.intervalSeconds}` } : { 'cache-control': 'no-cache' } },
    '/api/app/testing/**': !isTestEnv() ? { redirect: '/' } : {}
  },

  ignore: [...AcsysFilesGlobForWatchers, ...(!isElectronBuild() ? ['electron'] : [])],
  watch: [...(AcsysFilesGlobForWatchers?.map(fg => `!${fg}`) ?? []), ...(!isElectronBuild() ? ['!electron'] : [])],
  
  nitro: {
    runtimeConfig: (isElectronBuild() && !isDevEnv()) ? {
      app: {
        baseURL: '/'
      }
    } : undefined,
    rollupConfig: (isDevEnv() || isElectronBuild()) ? {
      // sharp@0.32.6 - switch to dynamic sharp bundling to prevent repeated initialization issues (during hmr, client/server builds  e.t.c)
      // @ts-expect-error disable deep instantion warn
      plugins: [SharpDynamicLoaderPlugin],
      external: ['sharp']
    } : undefined,
    storage: {
      'glb:images:srcset': (isDevEnv() && !isElectronBuild()) ? 
        {
          driver: 'fs',
          base: AppConfig.images.cacheFsDir,
        } : 
        { 
          driver: 'memory'
        }
      },
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
    },
    {
      baseName: 'locales',
      dir: './../assets/locales'
    }]
  },

  modules: [
    //['nuxt-electron', {}],
    ['@nuxtjs/google-fonts', {}],
    ['@nuxtjs/i18n', {}],
    ['@sidebase/nuxt-auth', {}],
    ['dayjs-nuxt', {}],
    ['@pinia/nuxt', {}],
    ['@nuxt/test-utils/module', {}],
    ['nuxt-tiptap-editor', {}],
    ['@nuxt/eslint', {}],
    ["@nuxt/ui", {}],
    ["nuxt-svgo", {}],
    ['@nuxt/image', {}],
    ['@nuxtjs/seo', {}],
    ["@nuxt/content", {}]
  ],

  build: {
    transpile: ['jsonwebtoken']
  },

  hooks: AppConfig.dataSeeding.customLoadingStub ? {
    'ready': async (nuxt) => {
      const loadingTemplate = nuxt.options.devServer.loadingTemplate({ loading: 'Seeding database & loading' });
      const templateFile = resolve(join('assets', 'templates', LoadingStubFileName));
      await writeFile(templateFile, loadingTemplate);
    }
  } : undefined,
  
  vite: {
    // Electron
    ...(isElectronBuild() ? {
      build: {
        rollupOptions: {
          external: ['sharp']
        }
      }
    } : {}),

    // Winston client
    ...(UseWinstonOnClient ? WinstonClientBuildConfig.vite : 
      // Don't compile winston sources when not used
      {
        $client: {
          resolve: {
            alias: {
              './../client/winston-logger': './../client/simple-http-logger'
            }
          }
        }
      })
  },

  $development: {
    imports: {
      imports: [
        ...(UseWinstonOnClient ? WinstonClientBuildConfig.imports!.imports! : []),
        // needed for pdfkit
        { name: 'Blob', from: 'node:buffer' },
        { name: 'Buffer', from: 'node:buffer' },
      ]
    },
    build: {
      transpile: isElectronBuild() ? ['lodash'] : undefined,
    },
  },

  $test: {
    experimental: {
      renderJsonPayloads: false,
      clientNodeCompat: false
    },
    vite: {
      build: {
        rollupOptions: {
          onLog: rollupLogHandler,
          external: ['sharp']
        },
        chunkSizeWarningLimit: 1000
      }
    },
    build: {
      transpile: ['lodash', 'file-saver']
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
        onLog: rollupLogHandler,
        external: ['sharp']
      }
    }
  },

  /** Production overrides */
  $production: {
    build: {
      transpile: ['lodash', 'file-saver']
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
        gzip: !isPublishEnv() && !isElectronBuild()
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
      },
      prerender: {
        failOnError: true
      },
      hooks: {
        'compiled':  async (ctx) => { 
          // TODO: temporary workaround to be sure build process exits
          const allCompleted = !!ctx._prerenderedRoutes?.length;
          if(allCompleted) {
            process.exit(0);
          }
        },
      },
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