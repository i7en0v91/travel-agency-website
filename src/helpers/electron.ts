import { type AppPage, type Locale, DefaultLocale, AppException, AppExceptionCodeEnum, getI18nResName2, getI18nResName3, type Theme, type I18nResName } from '@golobe-demo/shared';
import { type ConfirmBoxButton } from './../types';
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
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating navigation facade');

  const result: INavigationFacade = {
    getCurrentUrl: async (): Promise<string> => {
      logger.debug('(electron-helpers) get current url');
      const electronShell = getClientServices().getElectronShell();
      const result = await electronShell.getCurrentUrl();
      logger.debug(`(electron-helpers) get current url, result=[${result}]`);
      return result;
    },
    notifyPageNavigated(page: AppPage) {
      logger.debug(`(electron-helpers) notifying page navigated, page=${page}`);
      const electronShell = getClientServices().getElectronShell();
      const result = electronShell.notifyPageNavigated(page);
      return result;
    }
  };

  logger.debug('(electron-helpers) navigation facade created');
  return result;
}

export const getSystemServicesFacade = once(createSystemServicesFacade);
function createSystemServicesFacade(): ISystemServicesFacade {
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating system services facade');

  const result: ISystemServicesFacade = {
    renderPageToImage: async (path: string): Promise<Uint8Array> => {
      logger.debug(`(electron-helpers) render page to image, path=${path}`);
      const electronShell = getClientServices().getElectronShell();
      const result = await electronShell.renderPageToImage(path);
      logger.debug(`(electron-helpers) render page to image, path=${path}, length=${result.length}`);
      return result;
    }
  };
  logger.debug('(electron-helpers) system services facade created');
  return result;
}

export const getSystemPreferencesFacade = once(createSystemPreferencesFacade);
function createSystemPreferencesFacade(): ISystemPreferencesFacade {
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating system preferences facade');

  const result: ISystemPreferencesFacade = {
    getLocale: async (): Promise<Locale> => {
      logger.debug('(electron-helpers) get locale');
      const electronShell = getClientServices().getElectronShell();
      let result: Locale = DefaultLocale;
      const appLocale = (await electronShell.getAppLocale()).toLowerCase();
      if(appLocale.startsWith('fr')) {
        result = 'fr';
      } else if(appLocale.startsWith('ru'))  {
        result = 'ru';
      }    
      logger.debug(`(electron-helpers) get locale, result=${result}`);
      return result;
    }
  };
  logger.debug('(electron-helpers) system preferences facade created');
  return result;
}

export const getDialogsFacade = once(createDialogsFacade);
function createDialogsFacade(localizer: (ReturnType<typeof useI18n>)['t'] | undefined): IDialogsFacade {
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating dialogs facade');

  const result = {
    showNotification: (type: 'info' | 'warning' | 'error' | 'fatal', msg: string) => {
      logger.verbose(`(electron-helpers) showing notification, type=${type}, msg=${msg}`);      
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
            logger.warn('(electron-helpers) exception while localizing title', err);
          }
        }
        electronShell.showMessageBox(type, msg, title);
      }
    },
    showConfirmBox: async (msg: string, buttons: ConfirmBoxButton[]): Promise<ConfirmBoxButton> => {
      logger.verbose(`(electron-helpers) showing confirm box, msg=${msg}, buttons=[${buttons.join(', ')}]`);
      const buttonLabels = new Map<string, ConfirmBoxButton>(
        buttons.map(b => [localizer(getI18nResName2('confirmBox', b === 'yes' ? 'btnYes' : (b === 'no' ? 'btnNo' : 'btnCancel'))), b])
      );
      const title = localizer(getI18nResName3('electron', 'messageBox', 'confirm'));
      const electronShell = getClientServices().getElectronShell();
      const resultLabel = await electronShell.showConfirmBox(msg, title, Array.from(buttonLabels.keys()));
      const result = resultLabel ? (buttonLabels.get(resultLabel) as ConfirmBoxButton) : 'cancel';
      logger.verbose(`(electron-helpers) showing confirm box, msg=${msg}, result=${result}`);
      return result;
    }
  };
  logger.debug('(electron-helpers) dialogs facade created');
  return result;
}

export const getThemeFacade = once(createThemeFacade);
function createThemeFacade(): IThemeFacade {
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating theme facade');
  const result = {
    notifyThemeChanged(theme: Theme) {
      logger.debug(`(electron-helpers) notifying theme changed, theme=${theme}`);
      const electronShell = getClientServices().getElectronShell();
      electronShell.notifyThemeChanged(theme);
    }
  };
  logger.debug('(electron-helpers) theme facade created');
  return result;
}

export const getAppMenuFacade = once(createAppMenuFacade);
function createAppMenuFacade(): IAppMenuFacade {
  const logger = getCommonServices().getLogger();
  logger.debug('(electron-helpers) creating app menu facade');
  const result = {
    notifyNavBarRefreshed(nav: NavProps) {
      logger.debug('(electron-helpers) notifying nav bar refreshed');
      const electronShell = getClientServices().getElectronShell();
      electronShell.notifyNavBarRefreshed(nav);
    }
  };
  logger.debug('(electron-helpers) app menu facade created');
  return result;
}

export function buildNavProps(isAuthenticated: boolean, t: (ReturnType<typeof useI18n>)['t'], locale: Locale | undefined): NavProps {
  const logger = getCommonServices().getLogger();
  try {
    logger.verbose(`(electron-helpers) building nav props, isAuthenticated=${isAuthenticated}`);

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

    logger.verbose(`(electron-helpers) nav props built, isAuthenticated=${isAuthenticated}`);
    return result;
  } catch(err: any) {
    logger.error(`(electron-helpers) error occured while building nav props, isAuthenticated=${isAuthenticated}`, err);
    throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to build navbar properties', 'error-page');
  }
}