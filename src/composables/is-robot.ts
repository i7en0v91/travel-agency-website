import { HeaderUserAgent, isPublishEnv } from '@golobe-demo/shared';
import { isbot } from 'isbot';
import { getCommonServices } from '../helpers/service-accessors';

export function isRobot () {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'IsRobot' });

  if (!isPublishEnv()) {
    logger.debug('non-publish env');
    return false;
  }

  if (import.meta.client) {
    const result = window.navigator?.userAgent ? isbot(window.navigator.userAgent!) : true;
    logger.debug('client', { userAgent: window.navigator?.userAgent, result });
    return result;
  } else {
    try {
      const requestEvent = useRequestEvent();
      const userAgentHeader = requestEvent?.headers?.get(HeaderUserAgent);
      if (userAgentHeader) {
        const result = isbot(userAgentHeader);
        logger.debug('server', { userAgent: userAgentHeader, result });
        return result;
      } else {
        logger.debug('server, unknown agent');
        return false;
      }
    } catch (err: any) {
      logger.warn('got exception while checking for bot', err);
      return true;
    }
  }
}
