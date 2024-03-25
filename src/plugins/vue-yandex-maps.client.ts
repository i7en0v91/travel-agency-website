import plugin from 'vue-yandex-maps';
import AppConfig from '../appconfig';
import { type IAppLogger } from '../shared/applogger';
import { DefaultLocale, type Locale } from './../shared/constants';
import { getLocaleFromUrl } from './../shared/i18n';
import { getCurrentThemeSettings } from './../client/helpers';

function getLocaleUrlParam (locale: Locale): string {
  switch (locale) {
    case 'ru':
      return 'ru_RU';
    default:
      return 'en_US';
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const logger = ((globalThis as any).CommonServicesLocator as any)?.getLogger() as IAppLogger | undefined;
  if (!AppConfig.maps) {
    logger?.info('skipping yandex maps plugin, maps are disabled');
    return;
  }
  logger?.info('installing yandex maps plugin');

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    const errmsg = 'YandexMaps API key was not specified';
    logger?.error(errmsg);
    throw new Error(errmsg);
  };

  const path = nuxtApp._route?.path;
  const locale = (path ? getLocaleFromUrl(path) : undefined) ?? DefaultLocale;
  const localeWithRegion = getLocaleUrlParam(locale);

  const theme = getCurrentThemeSettings();

  const settings = {
    apiKey,
    lang: localeWithRegion,
    coordorder: 'latlong',
    debug: false,
    theme,
    version: '2.1'
  };

  nuxtApp.vueApp.use(plugin, settings);
  logger?.info(`yandex maps plugin installed, locale=${localeWithRegion}, theme=${theme}`);
});
