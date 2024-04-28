import castArray from 'lodash-es/castArray';
import omit from 'lodash-es/omit';
import { wrapExceptionIfNeeded, defaultErrorHandler } from '../../shared/exceptions';
import AppConfig from '../../appconfig';
import { parseLevelFromNuxtLog } from '../../shared/applogger';

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
    console.warn(`Vue warn: ${msg}; trace: ${trace}`);
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
    const logger = CommonServicesLocator.getLogger();
    logger?.error('(app:chunkError) app error occured', wrapExceptionIfNeeded(err));
  });

  nuxtApp.hook('app:error', (err: any) => {
    const logger = CommonServicesLocator.getLogger();
    logger?.error('(app:error) serious app error occured', wrapExceptionIfNeeded(err));

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
        const fullMsg = `(dev:ssr-logs) [server-side] ${logItem.message ?? (logItem.args as any)?.msg ?? ''} ${logItem.additional ? castArray(logItem.additional).join(', ') : ''}`;
        if (checkNeedSuppressVueMsg(fullMsg, stack, undefined)) {
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
