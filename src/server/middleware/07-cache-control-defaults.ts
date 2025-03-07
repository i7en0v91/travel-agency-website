import { AppConfig, HeaderCacheControl } from '@golobe-demo/shared';
import isArray from 'lodash-es/isArray';
import { getCommonServices } from '../../helpers/service-accessors';

export default defineEventHandler(async (event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'CacheControlDefaults' });
  const cacheControlHeaderValue = await getResponseHeader(event, HeaderCacheControl);
  if((isArray(cacheControlHeaderValue) && cacheControlHeaderValue.some(v => !!v)) || !!cacheControlHeaderValue) {
    logger.debug('cache control header present', { value: cacheControlHeaderValue });
    return;
  }

  logger.verbose('cache control header not present, setting default');
  try {
    await setResponseHeader(event, HeaderCacheControl, AppConfig.caching.httpDefaults);
  } catch(err: any) {
    logger.warn('failed to set cache control header default value', err);
  }
});
