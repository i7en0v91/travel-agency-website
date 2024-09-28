import { AppException, AppExceptionCodeEnum } from "@golobe-demo/shared";
import { getCommonServices } from "../helpers/service-accessors";

export default defineNuxtPlugin({
  parallel: false,
  dependsOn: ['startup.server'],
  hooks: {
    'app:created' () {
      const nuxtApp = useNuxtApp();
      const cacheablePageParamsError = nuxtApp.ssrContext?.event.context?.cacheablePageParamsError;
      if(cacheablePageParamsError) {
        const logger = getCommonServices().getLogger();
        logger.warn(`(cacheable-page) there was an exception parsing page params, type=${cacheablePageParamsError}`);
        throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'page request query is incorrectly formatted', 'error-page');
      }
    }
  }
});
