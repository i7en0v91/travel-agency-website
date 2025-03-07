import { type AppPage, type Locale, DefaultLocale, AppException, AppExceptionCodeEnum, getI18nResName2, getI18nResName3, type Theme, type I18nResName } from '@golobe-demo/shared';
import type { ConfirmBoxButton } from './../types';
import type { NavProps } from '../electron/interfaces';
import { getClientServices, getCommonServices } from './service-accessors';
import once from 'lodash-es/once';

interface IDialogsFacade {
  showNotification(type: 'info' | 'warning' | 'error' | 'fatal', msg: string): void;
  showConfirmBox(msg: string, buttons: ConfirmBoxButton[]): Promise<ConfirmBoxButton | 'cancel'>;
}

interface IThemeFacade {
  notifyThemeChanged(theme: Theme): void
}

interface IAppMenuFacade {
  notifyNavBarRefreshed(nav: NavProps): void
}

interface ISystemPreferencesFacade {
  getLocale(): Promise<Locale>
}

interface ISystemServicesFacade {
  renderPageToImage(path: string): Promise<Uint8Array>
}

interface INavigationFacade {
  getCurrentUrl(): Promise<string>;
  notifyPageNavigated(page: AppPage): void
}

export const getNavigationFacade = once(createNavigationFacade);
function createNavigationFacade(): INavigationFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating navigation facade');

  const result: INavigationFacade = {
    getCurrentUrl: async (): Promise<string> => {
      logger.debug('get current url');
      const electronShell = getClientServices().getElectronShell();
      const result = await electronShell.getCurrentUrl();
      logger.debug('get current url', result);
      return result;
    },
    notifyPageNavigated(page: AppPage) {
      logger.debug('notifying page navigated', page);
      const electronShell = getClientServices().getElectronShell();
      const result = electronShell.notifyPageNavigated(page);
      return result;
    }
  };

  logger.debug('navigation facade created');
  return result;
}

export const getSystemServicesFacade = once(createSystemServicesFacade);
function createSystemServicesFacade(): ISystemServicesFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating system services facade');

  const result: ISystemServicesFacade = {
    renderPageToImage: async (path: string): Promise<Uint8Array> => {
      logger.debug('render page to image', path);
      const electronShell = getClientServices().getElectronShell();
      const result = await electronShell.renderPageToImage(path);
      logger.debug('render page to image', { path, length: result.length });
      return result;
    }
  };
  logger.debug('system services facade created');
  return result;
}

export const getSystemPreferencesFacade = once(createSystemPreferencesFacade);
function createSystemPreferencesFacade(): ISystemPreferencesFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating system preferences facade');

  const result: ISystemPreferencesFacade = {
    getLocale: async (): Promise<Locale> => {
      logger.debug('get locale');
      const electronShell = getClientServices().getElectronShell();
      let result: Locale = DefaultLocale;
      const appLocale = (await electronShell.getAppLocale()).toLowerCase();
      if(appLocale.startsWith('fr')) {
        result = 'fr';
      } else if(appLocale.startsWith('ru'))  {
        result = 'ru';
      }    
      logger.debug('get locale', result);
      return result;
    }
  };
  logger.debug('system preferences facade created');
  return result;
}

export const getDialogsFacade = once(createDialogsFacade);
function createDialogsFacade(localizer: (ReturnType<typeof useI18n>)['t'] | undefined): IDialogsFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating dialogs facade');

  const result = {
    showNotification: (type: 'info' | 'warning' | 'error' | 'fatal', msg: string) => {
      logger.verbose('showing notification', { type, msg });      
      const electronShell = getClientServices().getElectronShell();
      if(type === 'fatal') {
        electronShell.showFatalErrorBox(msg);
      } else {
        let title: string | undefined;
        if(localizer) {
          try {
            let titleResName: I18nResName = getI18nResName3('electron', 'messageBox', 'info');
            if(type === 'error') {
              titleResName = getI18nResName3('electron', 'messageBox', 'error');
            } else if(type === 'warning') {
              titleResName = getI18nResName3('electron', 'messageBox', 'warning');
            } 
            title = localizer(titleResName);
          } catch(err: any) {
            logger.warn('exception while localizing title', err);
          }
        }
        electronShell.showMessageBox(type, msg, title);
      }
    },
    showConfirmBox: async (msg: string, buttons: ConfirmBoxButton[]): Promise<ConfirmBoxButton> => {
      logger.verbose('showing confirm box', msg);
      const buttonLabels = new Map<string, ConfirmBoxButton>(
        buttons.map(b => [localizer(getI18nResName2('confirmBox', b === 'yes' ? 'btnYes' : (b === 'no' ? 'btnNo' : 'btnCancel'))), b])
      );
      const title = localizer(getI18nResName3('electron', 'messageBox', 'confirm'));
      const electronShell = getClientServices().getElectronShell();
      const resultLabel = await electronShell.showConfirmBox(msg, title, Array.from(buttonLabels.keys()));
      const result = resultLabel ? (buttonLabels.get(resultLabel) as ConfirmBoxButton) : 'cancel';
      logger.verbose('showing confirm box', { msg, result });
      return result;
    }
  };
  logger.debug('dialogs facade created');
  return result;
}

export const getThemeFacade = once(createThemeFacade);
function createThemeFacade(): IThemeFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating theme facade');
  const result = {
    notifyThemeChanged(theme: Theme) {
      logger.debug('notifying theme changed', theme);
      const electronShell = getClientServices().getElectronShell();
      electronShell.notifyThemeChanged(theme);
    }
  };
  logger.debug('theme facade created');
  return result;
}

export const getAppMenuFacade = once(createAppMenuFacade);
function createAppMenuFacade(): IAppMenuFacade {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  logger.debug('creating app menu facade');
  const result = {
    notifyNavBarRefreshed(nav: NavProps) {
      logger.debug('notifying nav bar refreshed');
      const electronShell = getClientServices().getElectronShell();
      electronShell.notifyNavBarRefreshed(nav);
    }
  };
  logger.debug('app menu facade created');
  return result;
}

export function buildNavProps(isAuthenticated: boolean, t: (ReturnType<typeof useI18n>)['t'], locale: Locale | undefined): NavProps {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'ElectronHelpers' });
  try {
    logger.verbose('building nav props', isAuthenticated);

    const tl: (resName: I18nResName) => string = locale ? (resName) => t(resName, resName, { locale }) : t;
    const result: NavProps = [
      {
        role: 'file',
        label: '', // will be merged
        subItems: [
          { role: 'flights', label: tl(getI18nResName2('nav', 'findFlights')) },
          { role: 'stays', label: tl(getI18nResName2('nav', 'findStays')) },
          { role: 'index', label: tl(getI18nResName3('electron', 'menu', 'mainPage')) }
        ]
      },
      {
        role: 'account',
        label: tl(getI18nResName3('electron', 'menu', 'account')),
        subItems: isAuthenticated ? [
          { role: 'profile', label: tl(getI18nResName3('nav', 'userBox', 'myAccount')) },
          { role: 'favourites', label: tl(getI18nResName3('nav', 'userBox', 'favourites')) },
          { role: 'logout', label: tl(getI18nResName3('nav', 'userBox', 'logout')) }
        ] : [
          { role: 'login', label: tl(getI18nResName2('nav', 'login')) },
          { role: 'signup', label: tl(getI18nResName2('nav', 'signUp')) },
        ]
      },
      {
        role: 'view',
        label: '', // will be merged into 'viewMenu'
        subItems: [
          { role: 'go-back', label: tl(getI18nResName3('electron', 'menu', 'back')) },
          { role: 'go-next', label: tl(getI18nResName3('electron', 'menu', 'next')) }
        ] 
      },
      {
        role: 'view:theme',
        label: tl(getI18nResName3('electron', 'menu', 'theme')), // will be merged into 'viewMenu'
        subItems: [
          { role: 'theme:dark', label: tl(getI18nResName3('electron', 'menu', 'themeDark')) },
          { role: 'theme:light', label: tl(getI18nResName3('electron', 'menu', 'themeLight')) }
        ] 
      },
      {
        role: 'view:locale',
        label: tl(getI18nResName3('electron', 'menu', 'locale')), // will be merged into 'viewMenu'
        subItems: [
          { role: 'locale:en', label: 'English' },
          { role: 'locale:fr', label: 'Français' },
          { role: 'locale:ru', label: 'Русский' }
        ] 
      },
      {
        role: 'help',
        label: '', // will be merged
        subItems: [
          { role: 'contact-us', label: tl(getI18nResName3('electron', 'menu', 'contactUs')) }
        ] 
      }
    ];

    logger.verbose('nav props built', isAuthenticated);
    return result;
  } catch(err: any) {
    logger.error('error occured while building nav props', err, isAuthenticated);
    throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to build navbar properties', 'error-page');
  }
}