import { wrapExceptionIfNeeded, parseLevelFromNuxtLog, checkNeedSuppressVueMsg, checkNeedSuppressServerMsg } from '@golobe-demo/shared';
import { defaultErrorHandler } from '../helpers/exceptions';
import castArray from 'lodash-es/castArray';
import omit from 'lodash-es/omit';
import { getCommonServices } from '../helpers/service-accessors';
import { getActivePinia } from 'pinia';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err : any, _, info : string) => {
    if (checkNeedSuppressVueMsg(info, undefined, err)) {
      return;
    }

    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'NuxtVueApp' };
    logger.error(info, wrapExceptionIfNeeded(err), CommonLogProps);

    if (import.meta.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err, { nuxtApp: nuxtApp as any });
  };

  nuxtApp.vueApp.config.warnHandler = (msg : string, _, trace : string) => {
    if (checkNeedSuppressVueMsg(msg, trace, undefined)) {
      return;
    }

    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'NuxtVueApp' };
    logger.warn(msg + 'trace: ' + trace, undefined, CommonLogProps);
  };

  nuxtApp.hook('vue:error', (err : any, _, info : string) => {
    if (checkNeedSuppressVueMsg(info, undefined, err)) {
      return;
    }

    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'Vue' };
    logger.error(info, wrapExceptionIfNeeded(err), CommonLogProps);

    if (import.meta.client && err.errorHelmed) {
      // error has been already processed by ErrorHelm component
      return;
    }
    defaultErrorHandler(err, { nuxtApp: nuxtApp as any });
  });

  nuxtApp.hook('app:chunkError', (err: any) => {
    if (checkNeedSuppressServerMsg(undefined, err)) {
      return;
    }

    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'NuxtApp' };
    logger.error('chunk error occured', wrapExceptionIfNeeded(err), CommonLogProps);
  });

  nuxtApp.hook('app:error', (err: any) => {
    if (checkNeedSuppressServerMsg(undefined, err)) {
      return;
    }
    
    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'NuxtApp' };
    logger.error('nuxt app error occured', wrapExceptionIfNeeded(err), CommonLogProps);

    defaultErrorHandler(err, { nuxtApp: nuxtApp as any });
  });

  nuxtApp.hook('dev:ssr-logs', (logs) => {
    if (!logs) {
      return;
    }

    const CommonLogProps = { component: 'NuxtDevSsrLogs' };
    const logger = getCommonServices().getLogger();
    try {
      for (let i = 0; i < logs.length; i++) {
        const logItem = logs[i];
        const level = parseLevelFromNuxtLog(logItem);

        const args = logItem.args;
        const stack = args.filter(arg => !!arg?.stack).map(s => JSON.stringify(s)).join(';;;\r\n');
        const msgText = `${logItem.message ?? (logItem.args as any)?.msg ?? ''} ${logItem.additional ? castArray(logItem.additional).join(', ') : ''}`;
        const fullMsg = `[server-side] ${msgText}`;
        if (checkNeedSuppressVueMsg(msgText, stack, undefined) || checkNeedSuppressServerMsg(msgText, undefined)) {
          return;
        }

        switch (level) {
          case 'debug':
            logger.debug(fullMsg, { ...CommonLogProps, ...logItem.args });
            break;
          case 'verbose':
            logger.verbose(fullMsg, { ...CommonLogProps, ...logItem.args });
            break;
          case 'info':
            logger.info(fullMsg, { ...CommonLogProps, ...logItem.args });
            break;
          case 'warn':
            logger.warn(fullMsg, new Error('an error occured'), { ...CommonLogProps, ...omit(logItem.args, ['msg']) } );
            break;
          case 'error':
            logger.error(fullMsg, new Error('an error occured'), { ...CommonLogProps, ...omit(logItem.args, ['msg']) } );
            break;
        }
      }
    } catch (err: any) {
      logger.error(`error occured when processing nuxt dev logs`, err, { ...CommonLogProps, logs });
    }
  });

  (nuxtApp.$i18n as any).onBeforeLanguageSwitch = (oldLocale: string, newLocale: string) => {
    const logger = getCommonServices().getLogger();
    const CommonLogProps = { component: 'I18n' };
    logger.info(`onBeforeLanguageSwitch`, { ...CommonLogProps, from: oldLocale, to: newLocale });
  };

  const pinia = getActivePinia();
  if(pinia) {
    pinia?.use(({ store }) => {
      store.$onAction(({
        name,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        store,
        args,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        after,
        onError,
      }) => {
        onError((error) => {
          if(error) {
            store.getLogger().warn(`action failed`, error, { action: name, args });
            defaultErrorHandler(error, { nuxtApp: nuxtApp as any });
          }
        });
      });
    });
  } else {
    const CommonLogProps = { component: 'PiniaPlugins' };
    const logger = getCommonServices().getLogger();
    logger.error('failed to install error logging hooks for stores, pinia instance not available', CommonLogProps);
  }  
});
