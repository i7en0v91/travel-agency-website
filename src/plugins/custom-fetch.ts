import { type FetchExOptions, createFetch } from './../composables/fetch-ex';
import { getCommonServices } from "../helpers/service-accessors";

export default defineNuxtPlugin({
  parallel: false,
  enforce: 'default',
  async setup () {
    const logger = getCommonServices().getLogger().addContextProps({ component: 'CustomFetch' });
    logger.verbose('creating custom fetchers');
    const nuxtApp = useNuxtApp();
    const errorStubFetch = createFetch({ defautAppExceptionAppearance: 'error-stub' }, nuxtApp, () => logger);
    const errorPageFetch = createFetch({ defautAppExceptionAppearance: 'error-page' }, nuxtApp, () => logger);
    const fetchEx = (options: FetchExOptions) => {
      return options.defautAppExceptionAppearance === 'error-page' ? errorPageFetch : errorStubFetch;
    };
    logger.verbose('custom fetchers created');
    return {
      provide: {
        fetchEx
      }
    };
  },
});
