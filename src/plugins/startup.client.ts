import { type IAppLogger } from '@golobe-demo/shared';
import { ClientLogger } from './../client/logging';
import { EntityCache } from '../client/entity-cache';
import { type IClientServicesLocator } from '../types';
import { SearchFlightOffersDisplayOptions, SearchStayOffersDisplayOptions, FavouritesTabGroup } from '../helpers/constants';
import { getLastSelectedTabStorageKey } from './../helpers/dom';
import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import { createStorage, type Storage, type StorageValue } from 'unstorage';
import installLoggingHooks from './logging-hooks';
import { getCommonServices } from '../helpers/service-accessors';

function installGlobalExceptionHandler () {
  const logger = getCommonServices().getLogger();
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
    state: {
      mounted: false,
      navigatedFromPage: undefined
    }
  };
}

function resetSearchOffersFilterSettings (logger: IAppLogger) {
  logger.verbose('resetting user filter settings');
  localStorage.removeItem(getLastSelectedTabStorageKey(SearchFlightOffersDisplayOptions));
  localStorage.removeItem(getLastSelectedTabStorageKey(SearchStayOffersDisplayOptions));
}

function resetFavouritesTabSettings (logger: IAppLogger) {
  logger.verbose('resetting user favourites tab settings');
  localStorage.removeItem(getLastSelectedTabStorageKey(FavouritesTabGroup));
}

const initApp = once(() => {
  const logger = new ClientLogger(); // container has not built yet
  try {
    logger.info(`PAGE INITIALIZING... (${import.meta.env.MODE})`);
    const clientServicesLocator = (globalThis as any).CommonServicesLocator = (globalThis as any).ClientServicesLocator = buildServiceLocator();
    initializeBrowserPage();

    resetSearchOffersFilterSettings(logger);
    resetFavouritesTabSettings(logger);

    const nuxtApp = useNuxtApp();
    nuxtApp.hook('app:mounted', () => {
      clientServicesLocator.state.mounted = true;
    });
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
  }
});
