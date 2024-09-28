import { AppException, AppExceptionCodeEnum, type IAppLogger } from "@golobe-demo/shared";
import { createNuxtError } from "./../helpers/exceptions";
import { getServerServices } from "../helpers/service-accessors";

function showExceptionPage(exception: any, logger: IAppLogger) {
  logger.debug('(exception-page-handler) handling exception', exception);
  if(isNuxtError(exception)) {
    showError(exception);
  } else {
    if(AppException.isAppException(exception) && exception.code === AppExceptionCodeEnum.UNAUTHENTICATED) {
      logger.error('(exception-page-handler) unexpected unauthenticated exception on server side', exception);
      exception.code = AppExceptionCodeEnum.UNKNOWN;
    }
    showError(createNuxtError(exception));
  }
}

export default defineNuxtPlugin(
  {
    parallel: false,
    enforce: 'default',
    async setup (nuxtApp) {
      nuxtApp.hook('app:rendered', (ctx) => {
        const logger = getServerServices()!.getLogger();
        logger.debug('(exception-page-handler) app:rendered');

        const exception = ctx.ssrContext?.event?.context?.appException ?? useError()?.value;
        if(!exception) {
          logger.debug('(exception-page-handler) no exceptions');
          return;
        }
    
        showExceptionPage(exception, logger);
      });
    },
  });
