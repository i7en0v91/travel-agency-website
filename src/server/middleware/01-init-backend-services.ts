import { type IAppLogger } from '@golobe-demo/shared';
import { buildBackendServicesLocator, createLogger as createBackendLogger } from '@golobe-demo/backend';
import { defineEventHandler, type H3Event } from 'h3';
import once from 'lodash-es/once';
import { getCommonServices } from '../../helpers/service-accessors';

const LoggingPrefix = '(init-backend-services)';

const initServices = once(async (event: H3Event, logger: IAppLogger) => {  
  try {
    logger.info(`${LoggingPrefix} initializing services container`);
    (globalThis as any).CommonServicesLocator = (globalThis as any).ServerServicesLocator = await buildBackendServicesLocator(logger, event);
    logger.info(`${LoggingPrefix} services container initialized`);
  } catch (e) {
    logger.error(`${LoggingPrefix} services container initialization failed`, e);
    throw e;
  }
});


export default defineEventHandler(async (event: H3Event) => {
  if(getCommonServices()) {
    // already initialized
    return;
  }

  const logger = createBackendLogger(); // container has not built yet
  try {
    await initServices(event, logger);
  } catch(err: any) {
    logger.error(`${LoggingPrefix} exception during services container initialization`, err);
    throw err;
  }
});