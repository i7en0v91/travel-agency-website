import { DefaultTheme, isElectronBuild, SessionThemeKey, type Theme } from '@golobe-demo/shared';
import { getCurrentThemeSettings, setCurrentThemeSettings } from './../helpers/dom';
import { getCommonServices } from '../helpers/service-accessors';
import { getThemeFacade } from '../helpers/electron';

export interface IThemeSettings {
  currentTheme: Ref<Theme>,
  toggleTheme: () => void
}

let themeValue: Ref<Theme> | undefined;
let instance: IThemeSettings | undefined;

export function useThemeSettings (): IThemeSettings {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseThemeSettings' });

  const toggleTheme = () => {
    if (!instance) {
      logger.warn('cannot toggle theme, settings havent been initialized properly');
      return;
    }
    const targetValue: Theme = instance.currentTheme.value === 'light' ? 'dark' : 'light';
    logger.verbose('toggling theme to', { theme: targetValue });

    localStorage.setItem(SessionThemeKey, targetValue.toString());
    setCurrentThemeSettings(targetValue);
    themeValue!.value = targetValue;
    if(isElectronBuild()) {
      const themeFacade = getThemeFacade();
      themeFacade.notifyThemeChanged(targetValue);
    }
  };

  if (!instance) {
    logger.verbose('initializing theme settings');
    // this must be initialized in page-load.js script
    const initialValue: Theme = import.meta.client ? (getCurrentThemeSettings() ?? DefaultTheme) : 'light'; // TODO: fix initialization with undefined in Electron build
    logger.verbose('theme settings initialized with', { theme: initialValue });
    themeValue = ref(initialValue);
    instance = {
      currentTheme: themeValue,
      toggleTheme
    };
  }

  return instance;
}
