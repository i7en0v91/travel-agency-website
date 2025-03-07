import { getLocaleFromUrl, DefaultLocale, type Locale, AppConfig } from '@golobe-demo/shared';
import { createYmaps, type VueYandexMaps } from 'vue-yandex-maps';
import { getCommonServices } from '../helpers/service-accessors';

function getLocaleUrlParam (locale: Locale): string {
  switch (locale) {
    case 'ru':
      return 'ru_RU';
    default:
      return 'en_US';
  }
}

const CommonLogProps = { component: 'VueYandexMap' };

export default defineNuxtPlugin((nuxtApp) => {
  const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
  if (!AppConfig.maps) {
    logger.info('skipping yandex maps plugin, maps are disabled');
    return;
  }
  logger.info('installing yandex maps plugin');

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    logger.error('YandexMaps API key was not specified');
    throw new Error('YandexMaps API key was not specified');
  };

  const path = nuxtApp._route?.path;
  const locale = (path ? getLocaleFromUrl(path) : undefined) ?? DefaultLocale;
  const localeWithRegion = getLocaleUrlParam(locale);

  const settings: VueYandexMaps.PluginSettings = {
    apikey: apiKey,
    lang: localeWithRegion,
    version: 'v3'
  };

  nuxtApp.vueApp.use(createYmaps(settings));
  logger.info(`yandex maps plugin installed`, { locale: localeWithRegion });
});
