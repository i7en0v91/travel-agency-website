import type {  IClientServicesLocator, ICommonServicesLocator, IServerServicesLocator } from './shared/serviceLocator';
import type { CacheablePageParamsBase, IOgImageContext, IPreviewModeContext } from './shared/interfaces';
import type { ParseQueryCacheRequiredParamMissed, ParseQueryCacheValueNotAllowed } from './server/backend/common-services/html-page-model-metadata';
import type { AppException } from './shared/exceptions';
import type { createFetch, FetchExOptions } from './composables/fetch-ex';

declare global {
  let ClientServicesLocator: IClientServicesLocator;
  let ServerServicesLocator : IServerServicesLocator;
  let CommonServicesLocator: ICommonServicesLocator;
}

declare module 'h3' {
  interface H3EventContext {
    ogImageContext?: IOgImageContext,
    preview: IPreviewModeContext,
    cacheablePageParamsError?: ParseQueryCacheRequiredParamMissed['result'] | ParseQueryCacheValueNotAllowed['result'] | undefined,
    cacheablePageParams?: CacheablePageParamsBase,
    authCookies?: string[],
    authenticated?: boolean,
    appException?: AppException
  }
}

declare module '#app' {
  interface NuxtApp {
      $fetchEx: (options: FetchExOptions) => ReturnType<typeof createFetch>;
  }
}