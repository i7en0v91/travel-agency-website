import type {  IClientServicesLocator, ICommonServicesLocator, IServerServicesLocator, StayServiceLevel } from './shared/serviceLocator';
import type { Locale, Theme } from './shared/constants';

declare global {
  let ClientServicesLocator: IClientServicesLocator;
  let ServerServicesLocator : IServerServicesLocator;
  let CommonServicesLocator: ICommonServicesLocator;
}

declare module 'h3' {
  interface H3EventContext {
    ogImageRequest?: {
      locale?: Locale,
      isSecondPage?: boolean,
      theme?: Theme,
      serviceLevel?: StayServiceLevel
    },
    authCookies?: string[],
    authenticated?: boolean
  }
}