import { AppException, AppExceptionCodeEnum } from "./../shared/exceptions";

export default defineNuxtPlugin({
  parallel: false,
  dependsOn: ['startup.server'],
  hooks: {
    'app:created' () {
      const nuxtApp = useNuxtApp();
      const cacheablePageParamsError = nuxtApp.ssrContext?.event.context?.cacheablePageParamsError;
      if(cacheablePageParamsError) {
        const logger = CommonServicesLocator.getLogger();
        logger.warn(`(cacheable-page) there was an exception parsing page params, type=${cacheablePageParamsError}`);
        throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'page request query is incorrectly formatted', 'error-page');
      }
    }
  }
});
