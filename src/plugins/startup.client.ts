import { AppException, AppExceptionCodeEnum, isDevEnv, isElectronBuild, lookupPageByUrl, SystemPage, type IAppLogger } from '@golobe-demo/shared';
import { ClientLogger } from './../client/logging';
import { ElectronShell } from '../client/electron-shell';
import { EntityCache } from '../client/entity-cache';
import { type IClientServicesLocator } from '../types';
import { SearchFlightOffersDisplayOptions, SearchStayOffersDisplayOptions, FavouritesOptionButtonGroup } from '../helpers/constants';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices, getLastSelectedOptionStorageKey } from './../helpers/dom';
import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import { createStorage, type Storage, type StorageValue } from 'unstorage';
import installLoggingHooks from './logging-hooks';
import { getClientServices, getCommonServices } from '../helpers/service-accessors';
import { getDialogsFacade, getAppMenuFacade, getNavigationFacade, getSystemPreferencesFacade } from '../helpers/electron';
import { buildNavProps } from './../helpers/electron';
import { useNuxtApp } from 'nuxt/app';

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

function setupElectronShellIntegration() {
  const logger = getCommonServices().getLogger();
  logger.info('(ElectronShellIntegration) setting up');
  try {
    const nuxtApp = useNuxtApp();
    const router = useRouter();

    nuxtApp.hook('app:mounted', async () => {
      logger.verbose('(ElectronShellIntegration) setting watchers for navbar refresh');
      const { status } = useAuth();
      const i18n = nuxtApp.$i18n as ReturnType<typeof useI18n>;
      const t = i18n.t;
      // KB: assuming Electron specifies locale at startup
      //const locale = i18n.locale;
      watch([ status /*, locale*/ ], async () => {
        const locale = await getSystemPreferencesFacade().getLocale();
        logger.verbose(`(ElectronShellIntegration) refreshing navbar, auth=${status.value}, locale=${locale}`);
        try {
          const navProps = buildNavProps(status.value === 'authenticated', t, locale);
          const appMenuFacade = getAppMenuFacade();
          appMenuFacade.notifyNavBarRefreshed(navProps);
          logger.verbose(`(ElectronShellIntegration) navbar refreshed, auth=${status.value}, locale=${locale}`);
        } catch(err: any) {
          logger.error(`(ElectronShellIntegration) failed to refresh navbar, auth=${status.value}, locale=${locale}`, err);
        }
      }, { immediate: true });

      // quick workaround for Electron DEV build environment to apply stylings when app mounts
      if(isDevEnv()) {
        const themeSettings = useThemeSettings();
        setTimeout(() => {
          themeSettings.toggleTheme();
        });
      }
    });

    router.afterEach((to, from) => {
      logger.debug(`(ElectronShellIntegration) after each route handler, to=[${to.fullPath}], from=[${from.fullPath}]`);

      const pageFrom = lookupPageByUrl(from.fullPath);
      const pageTo = lookupPageByUrl(to.fullPath);

      if(!pageTo) {
        logger.warn(`(ElectronShellIntegration) cannot detect page navigated to, url=[${to.fullPath}]`);
        return;
      }

      if(pageTo === SystemPage.Drafts) {
        logger.verbose(`(ElectronShellIntegration) navigated to system page, url=[${to.fullPath}], page=${pageTo.valueOf()}`);
        return;
      }

      if(pageTo === pageFrom) {
        logger.debug(`(ElectronShellIntegration) navigated page hasn't changed, url=[${to.fullPath}], page=${pageTo.valueOf()}`);
        return;
      }

      getNavigationFacade().notifyPageNavigated(pageTo);
      logger.debug(`(ElectronShellIntegration) after each route handler completed, to=[${to.fullPath}], from=[${from.fullPath}]`);
    });

    logger.verbose('(ElectronShellIntegration) setup completed');
  } catch(err: any) {
    logger.error('(ElectronShellIntegration) setup failed', err);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'Electron configuration failed', 'error-page');
  }
}

let browserPageInitializationDone = false;
function initializeBrowserPage () {
  if (!browserPageInitializationDone) {
    const logger = getCommonServices().getLogger();
    logger.verbose('installing global exception handlers');
    installGlobalExceptionHandler();

    if(isElectronBuild()) {
      const error = useError()?.value;
      if(error) {
        logger.error('app initialization error for Electron build, terminating', error);
        const dialogsFacade = getDialogsFacade(undefined);
        dialogsFacade.showNotification('fatal', 'Unknown error');
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'app initialization failed', 'error-page');
      }
      setupElectronShellIntegration();
    }

    browserPageInitializationDone = true;
  }
}

function createCache (): Storage<StorageValue> {
  return createStorage();
}

function buildServiceLocator () : IClientServicesLocator {
  const injector = createInjector();
  const provider = (
    isElectronBuild() ?
      (injector
        .provideClass('logger', ClientLogger, Scope.Singleton)
        .provideValue('localizer', (useNuxtApp().$i18n as any).t)
        .provideClass('electronShell', ElectronShell, Scope.Singleton)) :
      (injector
        .provideClass('logger', ClientLogger, Scope.Singleton)
        .provideValue('localizer', undefined as any)
        .provideValue('electronShell', undefined as any))
    )
    .provideValue('cache', createCache())
    .provideClass('entityCache', EntityCache, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getElectronShell: () => isElectronBuild() ? provider.resolve('electronShell') : (undefined as any),
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
    const clientServicesLocator = (globalThis as any).CommonServicesLocator = (globalThis as any).ClientServicesLocator = buildServiceLocator();
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
      const clientServicesLocator = getClientServices();
      if (clientServicesLocator.appMounted) {
        setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
      }
    });
  }
});
