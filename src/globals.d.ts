import type {  IClientServicesLocator, ICommonServicesLocator, IServerServicesLocator } from './shared/serviceLocator';
import type { CacheablePageParamsBase, IOgImageContext } from './shared/interfaces';
import type { ParseQueryCacheRequiredParamMissed, ParseQueryCacheValueNotAllowed } from './server/backend/common-services/html-page-model-metadata';

declare global {
  let ClientServicesLocator: IClientServicesLocator;
  let ServerServicesLocator : IServerServicesLocator;
  let CommonServicesLocator: ICommonServicesLocator;
}

declare module 'h3' {
  interface H3EventContext {
    ogImageContext?: IOgImageContext,
    cacheablePageParamsError?: ParseQueryCacheRequiredParamMissed['result'] | ParseQueryCacheValueNotAllowed['result'] | undefined,
    cacheablePageParams?: CacheablePageParamsBase,
    authCookies?: string[],
    authenticated?: boolean
  }
}