import type { IAppLogger } from "../shared/applogger";
import { type FetchExOptions, createFetch } from './../composables/fetch-ex';

export default defineNuxtPlugin({
  parallel: false,
  enforce: 'default',
  async setup () {
    const logger = (globalThis as any).CommonServicesLocator.getLogger() as IAppLogger;
    logger.verbose('(custom-fetch) creating custom fetchers');
    const nuxtApp = useNuxtApp();
    const errorStubFetch = createFetch({ defautAppExceptionAppearance: 'error-stub' }, nuxtApp, logger);
    const errorPageFetch = createFetch({ defautAppExceptionAppearance: 'error-page' }, nuxtApp, logger);
    const fetchEx = (options: FetchExOptions) => {
      return options.defautAppExceptionAppearance === 'error-page' ? errorPageFetch : errorStubFetch;
    };
    logger.verbose('(custom-fetch) custom fetchers created');
    return {
      provide: {
        fetchEx
      }
    };
  },
});
