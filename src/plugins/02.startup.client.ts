import { Scope, createInjector } from 'typed-inject';
import once from 'lodash/once';
import { updateTabIndices } from '../shared/dom';
import { ClientLogger } from '../client/logging';
import { EntityCache } from '../client/entity-cache';
import type { IClientServicesLocator } from '../shared/serviceLocator';
import { UserSessionOnClient } from '../client/user-session';
import { TabIndicesUpdateDefaultTimeout } from '../shared/constants';
import installLoggingHooks from './common/errors-hooks';

function installGlobalExceptionHandler () {
  const logger = CommonServicesLocator.getLogger();
  const prevHandler = window.onerror;
  window.onerror = function (event: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) {
    try {
      prevHandler && prevHandler(event, source, lineno, colno, error);
    } finally {
      const err = error ?? { source, lineno, colno };
      logger.error('low-level error occured', err);
    }
  };

  window.addEventListener('error', (err) => {
    logger.error('low-level error occured', err);
  });
}

let browserPageInitializationDone = false;
function initializeBrowserPage () {
  if (!browserPageInitializationDone) {
    installGlobalExceptionHandler();
    browserPageInitializationDone = true;
  }
}

function buildServiceLocator () : IClientServicesLocator {
  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ClientLogger, Scope.Singleton)
    .provideClass('userSession', UserSessionOnClient, Scope.Singleton)
    .provideClass('entityCache', EntityCache, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getUserSession: () => provider.resolve('userSession'),
    getEntityCache: () => provider.resolve('entityCache'),
    appMounted: false
  };
}

const initApp = once(() => {
  const logger = new ClientLogger(); // container has not built yet
  try {
    logger.info(`PAGE INITIALIZING... (${import.meta.env.MODE})`);
    (globalThis as any).CommonServicesLocator = (globalThis as any).ClientServicesLocator = buildServiceLocator();
    const clientServicesLocator = <IClientServicesLocator>(globalThis as any).ClientServicesLocator;
    initializeBrowserPage();

    const nuxtApp = useNuxtApp();
    nuxtApp.hook('app:mounted', () => {
      updateTabIndices();
      clientServicesLocator.appMounted = true;
    });

    window.addEventListener('resize', () => setTimeout(updateTabIndices, TabIndicesUpdateDefaultTimeout));
  } catch (e) {
    logger.error('app initialization failed', e);
    throw e;
  }
});

export default defineNuxtPlugin((nuxtApp) => {
  initApp();

  nuxtApp.hook('app:created', () => {
    installLoggingHooks(nuxtApp);
    updateTabIndices();
  });

  nuxtApp.hook('page:loading:end', () => {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  });
});
