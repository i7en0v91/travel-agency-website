import { wrapExceptionIfNeeded, defaultErrorHandler } from '../../shared/exceptions';
import AppConfig from '../../appconfig';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err : any, _, info : string) => {
    if (!checkNeedSuppressVueMsg(info, undefined, err)) {
      const logger = CommonServicesLocator.getLogger();
      if (logger) {
        logger.error('(nuxtApp.vueApp.config.exceptionHandler) ' + info, wrapExceptionIfNeeded(err));
      }
    }

    if (process.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err);
  };

  nuxtApp.vueApp.config.warnHandler = (msg : string, _, trace : string) => {
    if (!checkNeedSuppressVueMsg(msg, trace, undefined)) {
      const logger = CommonServicesLocator.getLogger();
      if (logger) {
        logger.warn(`(nuxtApp.vueApp.config.warnHandler): ${msg}; trace: ${trace}`);
      }
      console.warn(`Vue warn: ${msg}; trace: ${trace}`);
    }
  };

  nuxtApp.hook('vue:error', (err : any, _, info : string) => {
    if (!checkNeedSuppressVueMsg(info, undefined, err)) {
      const logger = CommonServicesLocator.getLogger();
      if (logger) {
        logger.error('(nuxtApp.hook vue:exception) ' + info, wrapExceptionIfNeeded(err));
      }
    }

    if (process.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err);
  });

  nuxtApp.hook('app:chunkError', (err: any) => {
    const logger = CommonServicesLocator.getLogger();
    if (logger) {
      logger.error('(app:chunkError) app error occured', wrapExceptionIfNeeded(err));
    }
  });

  nuxtApp.hook('app:error', (err: any) => {
    const logger = CommonServicesLocator.getLogger();
    if (logger) {
      logger.error('(app:error) serious app error occured', wrapExceptionIfNeeded(err));
    }

    defaultErrorHandler(err);
  });

  (nuxtApp.$i18n as any).onBeforeLanguageSwitch = (oldLocale: string, newLocale: string) => {
    const logger = CommonServicesLocator.getLogger();
    logger.info(`(onBeforeLanguageSwitch) from ${oldLocale}, to ${newLocale}`);
  };

  function checkNeedSuppressVueMsg (msg?: string, trace?: string, err?: any): boolean {
    const vueSuppressRules = AppConfig.logging.suppress.vue;

    for (let i = 0; i < vueSuppressRules.length; i++) {
      const rule = vueSuppressRules[i];

      if (rule.messageFitler) {
        let matchesMsg = false;
        if (msg) {
          matchesMsg = (msg.match(rule.messageFitler)?.length ?? 0) > 0;
        }
        if (!matchesMsg && err) {
          matchesMsg = (JSON.stringify(err).match(rule.messageFitler)?.length ?? 0) > 0;
        }
        if (!matchesMsg) {
          continue;
        }
      }

      if (rule.componentNameFilter) {
        let matchesComponent = false;
        if (trace) {
          matchesComponent = (trace.match(rule.componentNameFilter)?.length ?? 0) > 0;
        }
        if (!matchesComponent && err) {
          matchesComponent = (JSON.stringify(err).match(rule.componentNameFilter)?.length ?? 0) > 0;
        }
        if (matchesComponent) {
          return true;
        }
      }
    }

    return false;
  }
});
