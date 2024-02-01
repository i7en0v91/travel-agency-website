import { type IUserSessionClient } from '../shared/interfaces';
import { SessionConstants, type Theme } from '../shared/constants';
import { useUserSession } from './user-session';

export interface IThemeSettings {
  currentTheme: Ref<Theme>,
  toggleTheme: () => Promise<void>
}

let themeValue: Ref<Theme> | undefined;
let instance: IThemeSettings | undefined;

export function useThemeSettings (): IThemeSettings {
  const logger = CommonServicesLocator.getLogger();
  const userSession = useUserSession() as IUserSessionClient;

  const toggleTheme = async (): Promise<void> => {
    if (!instance) {
      logger.warn('(useThemeSettings) cannot toggle theme, settings haven\'t been initialized properly');
      return;
    }
    const targetValue: Theme = instance.currentTheme.value === 'light' ? 'dark' : 'light';
    logger.verbose(`(useThemeSettings) toggling theme to ${targetValue}`);
    await userSession.setValue(SessionConstants.ThemeKey, targetValue.toString(), false);
    document.documentElement.dataset.theme = targetValue;
    themeValue!.value = targetValue;
  };

  if (!instance) {
    logger.verbose('(useThemeSettings) initializing theme settings');
    // this must be initialized in page-load.js script
    const initialValue: Theme = process.client ? (document.documentElement.dataset.theme as Theme) : 'light';
    logger.verbose(`(useThemeSettings) theme settings initialized with: ${initialValue}`);
    themeValue = ref(initialValue);
    instance = {
      currentTheme: themeValue,
      toggleTheme
    };
  }

  return instance;
}
