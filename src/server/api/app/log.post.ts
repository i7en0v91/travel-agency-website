import { LogAlwaysLevel, type LogLevelEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event: H3Event) => {
  const logger = getServerServices()!.getLogger();

  // client's message/error will be logged inside handler logging wrapper
  const body = await readBody(event);
  const logLevel = (body?.level === LogAlwaysLevel) ? LogAlwaysLevel : (body?.level as (keyof typeof LogLevelEnum));
  if (!body || !logLevel) {
    logger.warn('(api:log) received empty/incorrect log data from client');
    return;
  }

  const msgPrefix = '[CLIENT LOG]';
  switch (logLevel) {
    case 'verbose':
      logger.debug(msgPrefix, body);
      break;
    case 'debug':
      logger.verbose(msgPrefix, body);
      break;
    case 'info':
      logger.info(msgPrefix, body);
      break;
    case 'warn':
      logger.warn(msgPrefix, body);
      break;
    case 'error':
      logger.error(msgPrefix, body);
      break;
    case (LogAlwaysLevel as any):
      logger.always(msgPrefix, body);
      break;
  }

  return {};
}, { logResponseBody: false, authorizedOnly: false });
