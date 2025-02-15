import { HeaderUserAgent, isPublishEnv } from '@golobe-demo/shared';
import { isbot } from 'isbot';
import { getCommonServices } from '../helpers/service-accessors';

export function isRobot () {
  const logger = getCommonServices().getLogger();

  if (!isPublishEnv()) {
    logger.debug('(is-robot) non-publish env');
    return false;
  }

  if (import.meta.client) {
    const result = window.navigator?.userAgent ? isbot(window.navigator.userAgent!) : true;
    logger.debug(`(is-robot) client, userAgent=[${window.navigator?.userAgent}], result=${result}`);
    return result;
  } else {
    try {
      const requestEvent = useRequestEvent();
      const userAgentHeader = requestEvent?.headers?.get(HeaderUserAgent);
      if (userAgentHeader) {
        const result = isbot(userAgentHeader);
        logger.debug(`(is-robot) server, userAgent=[${userAgentHeader}], result=${result}`);
        return result;
      } else {
        logger.debug('(is-robot) server, userAgent=[], result=false');
        return false;
      }
    } catch (err: any) {
      logger.warn('(is-robot) got exception while checking for bot', err);
      return true;
    }
  }
}
