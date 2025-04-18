import type { IAppLogger } from '@golobe-demo/shared';
import { buildBackendServicesLocator, createLogger as createBackendLogger } from '@golobe-demo/backend';
import { defineEventHandler, type H3Event } from 'h3';
import once from 'lodash-es/once';
import { getCommonServices } from '../../helpers/service-accessors';

const CommonLogProps = { component: 'InitBackendServices' };

const initServices = once(async (event: H3Event, logger: IAppLogger) => {  
  try {
    logger.info('initializing services container');
    (globalThis as any).CommonServicesLocator = (globalThis as any).ServerServicesLocator = await buildBackendServicesLocator(logger);
    logger.info('services container initialized');
  } catch (err) {
    logger.error('services container initialization failed', err);
    throw err;
  }
});


export default defineEventHandler(async (event: H3Event) => {
  if(getCommonServices()) {
    // already initialized
    return;
  }
  
  const logger = createBackendLogger().addContextProps(CommonLogProps); // container has not built yet
  try {
    await initServices(event, logger);
  } catch(err: any) {
    logger.error('exception during services container initialization', err);
    throw err;
  }
});