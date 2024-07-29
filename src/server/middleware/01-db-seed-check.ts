import { type H3Event } from 'h3';
import { ApiEndpointPrefix, HeaderHost, HeaderContentType, LoadingStubFileName, AdminUserEmail, HeaderServerStartup, HeaderAppVersion, HeaderCacheControl } from '../../shared/constants';
import { type IAppLogger } from '../../shared/applogger';
import { spinWait } from '../../shared/common';
import AppConfig, { HostUrl, SiteUrl } from './../../appconfig' ;
import fromPairs from 'lodash-es/fromPairs';
import { ImageCategory } from '../../shared/interfaces';
import { createPrismaClient } from './../../server/backend/prisma/client';
import { getTemplatesAssetsStorage } from './../../server/backend/helpers/nitro';
import type { PrismaClient } from '@prisma/client';
import isBuffer from 'lodash-es/isBuffer';

async function getInitialDbSeedingStatus (event: H3Event, dbRepository: PrismaClient, logger?: IAppLogger) : Promise<'required' | 'running' | 'completed'> {
  logger?.debug('checking inital DB seeding status');
  let result: 'required' | 'running' | 'completed' = 'required';

  const adminUserCreated = (await dbRepository.userEmail.count({
    where: {
      email: AdminUserEmail
    }
  }) > 0);
  if(adminUserCreated) {
    const pageTitlesAdded = (await dbRepository.image.count({
      where: {
        category: {
          kind: ImageCategory.PageTitle.valueOf()
        }
      }
    })) >= 2;
    result = pageTitlesAdded ? 'completed' : 'running';
  } else {
    result = 'required';
  }

  logger?.debug(`inital DB seeding status check result = ${result}`);
  return result;
}


async function runServerStartup(logger?: IAppLogger): Promise<void> {
  logger?.info(`(db-seed-check) server startup request, url=${SiteUrl}`);
  try {
    const outgoingHeaders: HeadersInit = {
      Host: HostUrl,
      ...(fromPairs([
        [HeaderAppVersion, AppConfig.versioning.appVersion],
        [HeaderServerStartup, '1'],
        [HeaderHost, HostUrl]
      ])),
    };
    
    const url = SiteUrl;
    logger?.verbose(`(db-seed-check) sending GET, url=${url}`);
    let resultCode: number | false = false;
    await $fetch(url,
    {
      method: 'GET',
      cache: 'no-cache',
      headers: outgoingHeaders,
      responseType: 'text',
      async onRequestError (ctx): Promise<void> {
        logger?.error(`(db-seed-check) request exception occured, url=${url}`, ctx.error);
        resultCode = false;
      },
      async onResponseError(ctx): Promise<void> {
        logger?.error(`(db-seed-check) response exception occured, url=${url}, code=${ctx.response?.status ?? ''}, text=${ctx.response?.statusText ?? ''}`, ctx.error);
        resultCode = ctx.response?.status ?? false;
        if(resultCode && resultCode < 400) {
          resultCode = false;
        }
      },
      async onResponse (ctx): Promise<void> {        
        logger?.verbose(`(db-seed-check) response obtained, url=${url}, code=${ctx.response?.status ?? ''}, text=${ctx.response?.statusText ?? ''}`);
        resultCode = ctx.response?.status ?? false;
      }
    });

    if(resultCode && resultCode < 400) {
      logger?.info(`(db-seed-check) server startup request has completed, url=${SiteUrl}, result=${resultCode}`);
    } else {
      logger?.error(`(db-seed-check) server startup request failed, url=${SiteUrl}`);
      throw new Error('server startup request failed');
    }
  } catch (err: any) {
    logger?.error(`(db-seed-check) exception occured making server startup request, url=${SiteUrl}`, err);
  }
};

async function sendTemplateHtml(isLoading: boolean, event: H3Event, logger?: IAppLogger): Promise<void> {
  logger?.verbose(`(db-seed-check) sending page html template, isLoading=${isLoading}`);

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

  logger?.verbose(`(db-seed-check) page html template was sent, isLoading=${isLoading}`);
}

export default defineEventHandler(async (event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  let dbRepository: PrismaClient | undefined = (globalThis as any).GlobalPrismaClient as PrismaClient;
  if(!dbRepository) {
    const prismaClient = await createPrismaClient(logger);
    (globalThis as any).GlobalPrismaClient = dbRepository = prismaClient;  
  }

  if(!AppConfig.customLoadingStub) {
    return;
  }
  
  try {
    const isApiRequest = event.node.req.url?.includes(`/${ApiEndpointPrefix}`);
    if(isApiRequest) {
      return;
    }

    const isStartupRequest = event.headers.get(HeaderServerStartup) === '1';
    if(isStartupRequest) {
      logger?.verbose(`(db-seed-check) received server startup request`);
      return;
    }
  
    const dbSeedStatus = await getInitialDbSeedingStatus(event, dbRepository, logger);
    if(dbSeedStatus === 'completed') {
      logger?.debug(`(db-seed-check) status - completed. headers dump: [${JSON.stringify(event.headers)}]`);
      return;
    }

    logger?.verbose(`(db-seed-check) current status=${dbSeedStatus}, url=${event.node.req.url}`);  
    if(dbSeedStatus === 'required') {
      runServerStartup();
      const startedSuccessfully = await spinWait(async () => {
        const currentStatus = await getInitialDbSeedingStatus(event, dbRepository, logger);
        return currentStatus !== 'required';
      }, 30000);
      if(!startedSuccessfully) {
        logger?.error(`(db-seed-check) timeout starting DB seeding`);
        throw new Error('timeout starting DB seeding');
      }
    }
  
    await sendTemplateHtml(true, event, logger);  
  } catch(err: any) {
    logger?.error(`(db-seed-check) failed to send page html template`, err);
  }
});
