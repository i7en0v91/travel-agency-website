import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import { createStorage, type Storage, type StorageValue } from 'unstorage';
import { updateTabIndices } from '../shared/dom';
import { ClientLogger } from '../client/logging';
import { EntityCache } from '../client/entity-cache';
import type { IClientServicesLocator } from '../shared/serviceLocator';
import { TabIndicesUpdateDefaultTimeout, SearchFlightOffersDisplayOptions, SearchStayOffersDisplayOptions, FavouritesOptionButtonGroup } from '../shared/constants';
import { getLastSelectedOptionStorageKey } from './../shared/common';
import installLoggingHooks from './common/logging-hooks';
import type { IAppLogger } from './../shared/applogger';

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

function createCache (): Storage<StorageValue> {
  return createStorage();
}

function buildServiceLocator () : IClientServicesLocator {
  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ClientLogger, Scope.Singleton)
    .provideValue('cache', createCache())
    .provideClass('entityCache', EntityCache, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getEntityCache: () => provider.resolve('entityCache'),
    appMounted: false
  };
}

function resetSearchOffersFilterSettings (logger: IAppLogger) {
  logger.verbose('resetting user filter settings');
  localStorage.removeItem(getLastSelectedOptionStorageKey(SearchFlightOffersDisplayOptions));
  localStorage.removeItem(getLastSelectedOptionStorageKey(SearchStayOffersDisplayOptions));
}

function resetFavouritesTabSettings (logger: IAppLogger) {
  logger.verbose('resetting user favourites tab settings');
  localStorage.removeItem(getLastSelectedOptionStorageKey(FavouritesOptionButtonGroup));
}

const initApp = once(() => {
  const logger = new ClientLogger(); // container has not built yet
  try {
    logger.info(`PAGE INITIALIZING... (${import.meta.env.MODE})`);
    (globalThis as any).CommonServicesLocator = (globalThis as any).ClientServicesLocator = buildServiceLocator();
    const clientServicesLocator = (globalThis as any).ClientServicesLocator as IClientServicesLocator;
    initializeBrowserPage();

    resetSearchOffersFilterSettings(logger);
    resetFavouritesTabSettings(logger);

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

export default defineNuxtPlugin({
  name: 'startup-client',
  parallel: false,
  setup (nuxtApp) {
    initApp();

    nuxtApp.hook('app:created', () => {
      installLoggingHooks(nuxtApp);
    });

    nuxtApp.hook('page:loading:end', () => {
      const clientServicesLocator = (globalThis as any).ClientServicesLocator as IClientServicesLocator;
      if (clientServicesLocator.appMounted) {
        setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
      }
    });
  }
});
