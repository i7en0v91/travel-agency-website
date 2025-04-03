import { type IAppLogger, UseWinstonOnClient, AppException, AppExceptionCodeEnum, isDevEnv, isElectronBuild, lookupPageByUrl, SystemPage } from '@golobe-demo/shared';
import { Logger as ClientSimpleHttpLogger } from './../client/simple-http-logger';
import { Logger as ClientWinstonLogger } from './../client/winston-logger';
import { ElectronShell } from '../client/electron-shell';
import type { IClientServicesLocator } from '../types';
import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import installLoggingHooks from './logging-hooks';
import { getCommonServices } from '../helpers/service-accessors';
import { getDialogsFacade, getAppMenuFacade, getNavigationFacade, getSystemPreferencesFacade } from '../helpers/electron';
import { buildNavProps } from './../helpers/electron';
import { useNuxtApp } from 'nuxt/app';

const CommonLogProps = { component: 'StartupClient' };

function installGlobalExceptionHandler (logger: IAppLogger) {
  const prevHandler = window.onerror;
  window.onerror = function (event: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) {
    try {
      if(prevHandler) {
        prevHandler(event, source, lineno, colno, error);
      }
    } finally {
      const err = error ?? { source, lineno, colno };
      logger.error('low-level error occured', err);
    }
  };

  window.addEventListener('error', (err) => {
    logger.error('low-level error occured', err);
  });
}

function setupElectronShellIntegration(logger: IAppLogger) {
  logger.info('setting up');
  try {
    const nuxtApp = useNuxtApp();
    const router = useRouter();

    nuxtApp.hook('app:mounted', async () => {
      logger.verbose('setting watchers for navbar refresh');
      const { status } = useAuth();
      const i18n = nuxtApp.$i18n as ReturnType<typeof useI18n>;
      const t = i18n.t;
      // KB: assuming Electron specifies locale at startup
      //const locale = i18n.locale;
      watch([ status /*, locale*/ ], async () => {
        const locale = await getSystemPreferencesFacade().getLocale();
        logger.verbose(`refreshing navbar`, { auth: status.value, locale });
        try {
          const navProps = buildNavProps(status.value === 'authenticated', t, locale);
          const appMenuFacade = getAppMenuFacade();
          appMenuFacade.notifyNavBarRefreshed(navProps);
          logger.verbose(`navbar refreshed`, { auth: status.value, locale });
        } catch(err: any) {
          logger.error(`failed to refresh navbar`, err, { auth: status.value, locale });
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
      logger.debug(`after each route handler`, { to: to.fullPath, from: from.fullPath });

      const pageFrom = lookupPageByUrl(from.fullPath);
      const pageTo = lookupPageByUrl(to.fullPath);

      if(!pageTo) {
        logger.warn(`cannot detect page navigated`, undefined, { to: to.fullPath });
        return;
      }

      if(pageTo === SystemPage.Drafts) {
        logger.verbose(`navigated to system page`, { to: to.fullPath, page: pageTo });
        return;
      }

      if(pageTo === pageFrom) {
        logger.debug(`navigated page hasn't changed`, { to: to.fullPath, page: pageTo });
        return;
      }

      getNavigationFacade().notifyPageNavigated(pageTo);
      logger.debug(`after each route handler completed`, { to: to.fullPath, from: from.fullPath });
    });

    logger.verbose('setup completed');
  } catch(err: any) {
    logger.error('setup failed', err);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'Electron configuration failed', 'error-page');
  }
}

let browserPageInitializationDone = false;
function initializeBrowserPage () {
  if (!browserPageInitializationDone) {
    const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
    logger.verbose('installing global exception handlers');

    installGlobalExceptionHandler(
      logger.addContextProps({ 
        component: 'GlobalHooks' 
      })
    );

    if(isElectronBuild()) {
      const error = useError()?.value;
      if(error) {
        logger.error('app initialization error for Electron build, terminating', error);
        const dialogsFacade = getDialogsFacade(undefined);
        dialogsFacade.showNotification('fatal', 'Unknown error');
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'app initialization failed', 'error-page');
      }
      setupElectronShellIntegration(
        logger.addContextProps({ 
          component: 'ElectronShellIntegration' 
        })
      );
    }

    browserPageInitializationDone = true;
  }
}


/**
 * To use {@link winston} see comments in {@link WinstonEsmClientPlugin}
 */
function getLoggerClass() {
  return UseWinstonOnClient ? ClientWinstonLogger : ClientSimpleHttpLogger;
}

function buildServiceLocator () : IClientServicesLocator {
  const injector = createInjector();
  const provider = (
    isElectronBuild() ?
      (injector
        .provideClass('logger', getLoggerClass(), Scope.Singleton)
        .provideValue('localizer', (useNuxtApp().$i18n as any).t)
        .provideClass('electronShell', ElectronShell, Scope.Singleton)) :
      (injector
        .provideClass('logger', getLoggerClass(), Scope.Singleton)
        .provideValue('localizer', undefined as any)
        .provideValue('electronShell', undefined as any))
    );

  return {
    getLogger: () => provider.resolve('logger'),
    getElectronShell: () => isElectronBuild() ? provider.resolve('electronShell') : (undefined as any),
    lazy: {},
    state: {
      mounted: false,
      navigatedFromPage: undefined
    }
  };
}

const initApp = once(() => {
  const logger = new ClientSimpleHttpLogger().addContextProps(CommonLogProps); // container has not built yet
  try {
    logger.info(`PAGE INITIALIZING...`, { mode: import.meta.env.MODE });
    const clientServicesLocator = (globalThis as any).CommonServicesLocator = (globalThis as any).ClientServicesLocator = buildServiceLocator();
    initializeBrowserPage();

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
