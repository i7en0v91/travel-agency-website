import { LogAlwaysLevel, type IAppLogger, type LogLevel, type LogLevelEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../helpers/service-accessors';
import isArray from 'lodash-es/isArray';

async function handleLogEntry(logEntry: { level: LogLevel | (typeof LogAlwaysLevel), msg: any }, logger: IAppLogger): Promise<void> {
  const logLevel = (logEntry?.level === LogAlwaysLevel) ? LogAlwaysLevel : (logEntry?.level as (keyof typeof LogLevelEnum));
  if (!logEntry || !logLevel) {
    logger.warn('(api:log) received empty/incorrect log data from client');
    return;
  }

  const msg = `[CLIENT LOG] ${logEntry.msg ?? ''}`;
  switch (logLevel) {
    case 'verbose':
      logger.debug(msg, logEntry);
      break;
    case 'debug':
      logger.verbose(msg, logEntry);
      break;
    case 'info':
      logger.info(msg, logEntry);
      break;
    case 'warn':
      logger.warn(msg, logEntry);
      break;
    case 'error':
      logger.error(msg, logEntry);
      break;
    default:
      logger.always(msg, logEntry);
      break;
  }
}

export default defineWebApiEventHandler(async (event: H3Event) => {
  const logger = getServerServices()!.getLogger().addContextProps({ component: 'WebApi' });

  // client's message/error will be logged inside handler logging wrapper
  const body = await readBody(event);
  if(isArray(body)) {
    for(const logEntry of body) {
      await handleLogEntry(logEntry, logger);  
    }
  } else {
    await handleLogEntry(body, logger);
  }
  
  return {};
}, { logResponseBody: false, authorizedOnly: false });
