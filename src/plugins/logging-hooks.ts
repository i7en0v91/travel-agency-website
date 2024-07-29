import castArray from 'lodash-es/castArray';
import omit from 'lodash-es/omit';
import { wrapExceptionIfNeeded, defaultErrorHandler } from '../shared/exceptions';
import { parseLevelFromNuxtLog, checkNeedSuppressVueMsg, checkNeedSuppressServerMsg } from '../shared/applogger';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err : any, _, info : string) => {
    if (checkNeedSuppressVueMsg(info, undefined, err)) {
      return;
    }

    const logger = CommonServicesLocator.getLogger();
    logger?.error('(nuxtApp.vueApp.config.exceptionHandler) ' + info, wrapExceptionIfNeeded(err));

    if (import.meta.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err);
  };

  nuxtApp.vueApp.config.warnHandler = (msg : string, _, trace : string) => {
    if (checkNeedSuppressVueMsg(msg, trace, undefined)) {
      return;
    }

    const logger = CommonServicesLocator.getLogger();
    logger?.warn(`(nuxtApp.vueApp.config.warnHandler): ${msg}; trace: ${trace}`);
  };

  nuxtApp.hook('vue:error', (err : any, _, info : string) => {
    if (checkNeedSuppressVueMsg(info, undefined, err)) {
      return;
    }

    const logger = CommonServicesLocator.getLogger();
    logger?.error('(nuxtApp.hook vue:exception) ' + info, wrapExceptionIfNeeded(err));

    if (import.meta.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err);
  });

  nuxtApp.hook('app:chunkError', (err: any) => {
    if (checkNeedSuppressServerMsg(undefined, err)) {
      return;
    }

    const logger = CommonServicesLocator.getLogger();
    logger?.error('(app:chunkError) app error occured', wrapExceptionIfNeeded(err));
  });

  nuxtApp.hook('app:error', (err: any) => {
    if (checkNeedSuppressServerMsg(undefined, err)) {
      return;
    }
    
    const logger = CommonServicesLocator.getLogger();
    logger?.error('(app:error) error occured', wrapExceptionIfNeeded(err));

    defaultErrorHandler(err);
  });

  nuxtApp.hook('dev:ssr-logs', (logs) => {
    if (!logs) {
      return;
    }

    const logger = CommonServicesLocator.getLogger();
    try {
      for (let i = 0; i < logs.length; i++) {
        const logItem = logs[i];
        const level = parseLevelFromNuxtLog(logItem);

        const args = logItem.args;
        const stack = args.filter(arg => !!arg?.stack).map(s => JSON.stringify(s)).join(';;;\r\n');
        const msgText = `${logItem.message ?? (logItem.args as any)?.msg ?? ''} ${logItem.additional ? castArray(logItem.additional).join(', ') : ''}`;
        const fullMsg = `(dev:ssr-logs) [server-side] ${msgText}`;
        if (checkNeedSuppressVueMsg(msgText, stack, undefined) || checkNeedSuppressServerMsg(msgText, undefined)) {
          return;
        }

        switch (level) {
          case 'debug':
            logger.debug(fullMsg, logItem.args);
            break;
          case 'verbose':
            logger.verbose(fullMsg, logItem.args);
            break;
          case 'info':
            logger.info(fullMsg, logItem.args);
            break;
          case 'warn':
            logger.warn(fullMsg, new Error('an error occured'), omit(logItem.args, ['msg']));
            break;
          case 'error':
            logger.error(fullMsg, new Error('an error occured'), omit(logItem.args, ['msg']));
            break;
        }
      }
    } catch (err: any) {
      logger?.error(`(nuxt:dev) error occured when processing nuxt dev logs, logsObj=${JSON.stringify(logs)}`, err);
    }
  });

  (nuxtApp.$i18n as any).onBeforeLanguageSwitch = (oldLocale: string, newLocale: string) => {
    const logger = CommonServicesLocator.getLogger();
    logger.info(`(onBeforeLanguageSwitch) from ${oldLocale}, to ${newLocale}`);
  };

  
});
