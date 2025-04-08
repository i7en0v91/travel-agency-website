import type { createFetch, FetchExOptions } from './composables/fetch-ex';

declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        H3_SESSION_ENCRYPTION_KEY: string,
        AUTH_SECRET: string,
        OAUTH_GITHUB_CLIENT_ID: string,
        OAUTH_GITHUB_CLIENT_SECRET: string,
        OAUTH_GOOGLE_CLIENT_ID: string,
        OAUTH_GOOGLE_CLIENT_SECRET: string,
        GOOGLE_RECAPTCHA_SECRETKEY: string,
        VITE_GOOGLE_RECAPTCHA_PUBLICKEY: string,
        VITE_YANDEX_MAPS_API_KEY: string,
        VITE_ELECTRON_BUILD: number
      }
    }
  }
}

declare module 'nuxt/app' {
  interface NuxtApp {
      $fetchEx: (options: FetchExOptions) => ReturnType<typeof createFetch>;
  }
}

declare module 'h3' {
  interface H3EventContext {
    ogImageContext?: import('./packages/backend/types').IOgImageContext,
    preview: import('./packages/backend/types').IPreviewModeContext,
    cacheablePageParamsError?: import('./packages/backend/types').ParseQueryCacheRequiredParamMissed['result'] | import('@golobe-demo/backend/types').ParseQueryCacheValueNotAllowed['result'] | undefined,
    cacheablePageParams?: import('./packages/backend/types').CacheablePageParamsBase,
    appException?: import('./packages/shared').AppException,
    authCookies?: string[],
    authenticated?: boolean
  }
}

declare module 'pinia' {
  export interface PiniaCustomProperties {
    /**
     * @returns Nuxt app instance (for this store)
     */
    nuxtApp: ReturnType<typeof useNuxtApp>
  }
}