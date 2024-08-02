import { type IAppLogger } from '../../shared/applogger';
import { HeaderCacheControl } from '../../shared/constants';
import isArray from 'lodash-es/isArray';
import AppConfig from './../../appconfig';

export default defineEventHandler(async (event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  const cacheControlHeaderValue = await getResponseHeader(event, HeaderCacheControl);
  if((isArray(cacheControlHeaderValue) && cacheControlHeaderValue.some(v => !!v)) || !!cacheControlHeaderValue) {
    logger?.debug(`(cache-control-defaults) cache control header present, value=${JSON.stringify(cacheControlHeaderValue)}`);
    return;
  }

  logger?.verbose(`(cache-control-defaults) cache control header not present, setting default [${AppConfig.caching.httpDefaults}]`);
  try {
    await setResponseHeader(event, HeaderCacheControl, AppConfig.caching.httpDefaults);
  } catch(err: any) {
    logger?.warn(`(cache-control-defaults) failed to set cache control header default value [${AppConfig.caching.httpDefaults}]`, err);
  }
});
