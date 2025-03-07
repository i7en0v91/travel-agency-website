import { lookupPageByUrl, AppConfig, spinWait, type IAppLogger, HeaderContentType, LoadingStubFileName, HeaderCacheControl, isTestEnv } from '@golobe-demo/shared';
import type { IServerServicesLocator } from '@golobe-demo/backend';
import { defineEventHandler, sendWebResponse, type H3Event } from 'h3';
import type { Storage, StorageValue } from 'unstorage';
import { ApiEndpointLogging, ApiEndpointNuxtContentPrefix, ApiEndpointPrefix } from '../api-definitions';
import fromPairs from 'lodash-es/fromPairs';
import isBuffer from 'lodash-es/isBuffer';
import { consola } from 'consola';
import { getCommonServices, getServerServices } from '../../helpers/service-accessors';

const CommonLogProps = { component: 'DataSeed' };

async function getTemplatesAssetsStorage (logger: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$templatesStorage as Storage<StorageValue>;
  if (!result) {
    logger.error('templates assets storage is not available', undefined);
    throw new Error('templates assets storage is not available');
  }

  return result;
}

async function executeDataSeeding(logger: IAppLogger, event: H3Event): Promise<void> {
  consola.info('seeding with sample data - started (may take few minutes)');

  logger.info(`data seeding - start`);
  try {
    const dataSeedingLogic = getServerServices()!.getDataSeedingLogic();
    logger.lowerWarnsWithoutErrorLevel(true);
    await dataSeedingLogic.seed(event);
    logger.info(`data seeding - completed`);
    consola.info('seeding with sample data - completed');
  } catch(err: any) {
    logger.error(`data seeding - failed`, err);
    consola.error('seeding with sample data - FAILED', err);
    throw err;
  } finally {
    logger.lowerWarnsWithoutErrorLevel(false);
  }
}

type InitialDataSeedingStatus = Awaited<ReturnType<(ReturnType<IServerServicesLocator['getDataSeedingLogic']>)['getInitialSeedingStatus']>>;
async function waitForSeedingStatus(logger: IAppLogger, ...desiredStatuses: InitialDataSeedingStatus[]): Promise<void> {
  logger.verbose('starting to wait for expecting status of db seeding', { desiredStatuses });
  
  const dataSeedingLogic = getServerServices()!.getDataSeedingLogic();
  const startedSuccessfully = await spinWait(async () => {
    const currentStatus = await dataSeedingLogic.getInitialSeedingStatus();
    return desiredStatuses.includes(currentStatus);
  }, 15 * 60 * 1000); // 15 minutes for data seeding timeout

  if(!startedSuccessfully) {
    logger.error('timeout waiting for expecting status of db seeding', undefined, { desiredStatuses });
    throw new Error('timeout while seeding database');
  }

  logger.verbose('wait for db seeding - completed');
}

async function sendTemplateHtml(isLoading: boolean, logger: IAppLogger, event: H3Event): Promise<void> {
  logger.verbose('sending page html template', { isLoading });

  const templatesStorage = await getTemplatesAssetsStorage(logger);
  const originalTemplateRaw = await templatesStorage.getItemRaw(LoadingStubFileName);
  const originalTemplate: string = isBuffer(originalTemplateRaw) ? (<Buffer>originalTemplateRaw).toString('utf-8') : originalTemplateRaw.toString();
  const patchedTemplate = isLoading ? originalTemplate.replace('</body>', '<!--__NUXT_LOADING__--></body>') : originalTemplate;

  const response = new Response(patchedTemplate, {
    headers: fromPairs([
      [HeaderContentType, 'text/html'],
      [HeaderCacheControl, 'no-store'], // expecting this request was issued not by browser, but via js fetch
    ]),
    status: 200,
    statusText: 'OK'
  });
  await sendWebResponse(event, response);

  logger.verbose('page html template was sent', { isLoading });
}

let seedMethodExecuted = false;
export default defineEventHandler(async (event: H3Event) => {
  const url = event.node.req.url;
  if(!url) {
    return;
  }

  const isPageRequest = !url.includes(`/${ApiEndpointPrefix}`) && !!lookupPageByUrl(url);
  const isAppApiRequest = url.includes(`/${ApiEndpointPrefix}`) && 
    !url.includes(`/${ApiEndpointNuxtContentPrefix}`) && !url.includes(ApiEndpointLogging);
  const routeRequiresSampleData = isPageRequest || isAppApiRequest;
  if(!routeRequiresSampleData) {
    return;
  }

  const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
  const dataSeedingLogic = getServerServices()!.getDataSeedingLogic();
  const dbSeedStatus = await dataSeedingLogic.getInitialSeedingStatus();
  if(dbSeedStatus === 'completed') {
    logger.debug('status - completed', {  headers: event.headers });
    return;
  }

  const envAllowsSeeding = !isTestEnv();
  if (!envAllowsSeeding) {
    logger.error('initial data seeding is required, but current execution environment does not allow running it automatically');
    throw new Error('initial data seeding is required');
  }

  logger.verbose(`current status=${dbSeedStatus}, url=${event.node.req.url}`);  

  const isPrerendering = !!import.meta.prerender;  

  if(!isPrerendering && AppConfig.dataSeeding.customLoadingStub) {
    if(dbSeedStatus === 'required') {
      if (!seedMethodExecuted) {
        seedMethodExecuted = true;
        executeDataSeeding(logger, event);
      }
    }

    try {
      await sendTemplateHtml(true, logger, event);  
    } catch(err: any) {
      logger.error('failed to send page html template', err);
    }
  } else {
    if (!seedMethodExecuted) {
      seedMethodExecuted = true;
      await executeDataSeeding(logger, event);
    } 

    await waitForSeedingStatus(logger, 'completed');
  }
});
