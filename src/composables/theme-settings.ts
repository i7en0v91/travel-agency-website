import { SessionThemeKey, type Theme } from '@golobe-demo/shared';
import { getCurrentThemeSettings, setCurrentThemeSettings } from './../helpers/dom';
import { getCommonServices } from '../helpers/service-accessors';

export interface IThemeSettings {
  currentTheme: Ref<Theme>,
  toggleTheme: () => void
}

let themeValue: Ref<Theme> | undefined;
let instance: IThemeSettings | undefined;

export function useThemeSettings (): IThemeSettings {
  const logger = getCommonServices().getLogger();

  const toggleTheme = () => {
    if (!instance) {
      logger.warn('(useThemeSettings) cannot toggle theme, settings haven\'t been initialized properly');
      return;
    }
    const targetValue: Theme = instance.currentTheme.value === 'light' ? 'dark' : 'light';
    logger.verbose(`(useThemeSettings) toggling theme to ${targetValue}`);

    localStorage.setItem(SessionThemeKey, targetValue.toString());
    setCurrentThemeSettings(targetValue);
    themeValue!.value = targetValue;
  };

  if (!instance) {
    logger.verbose('(useThemeSettings) initializing theme settings');
    // this must be initialized in page-load.js script
    const initialValue: Theme = import.meta.client ? getCurrentThemeSettings() : 'light';
    logger.verbose(`(useThemeSettings) theme settings initialized with: ${initialValue}`);
    themeValue = ref(initialValue);
    instance = {
      currentTheme: themeValue,
      toggleTheme
    };
  }

  return instance;
}
