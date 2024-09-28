import { AppPage, lookupValueOrThrow, type EntityId } from '@golobe-demo/shared';
import { type ITestingInvalidateCacheDto, type ITestingInvalidateCacheResultDto, TestingInvalidateCacheDtoSchema } from '../../../api-definitions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger();
  const cacheCleanerLogic = getServerServices()!.getHtmlPageCacheCleaner();

  const isPreviewMode = event.context.preview.mode;
  if(isPreviewMode) {
    // KB: pages & responses not being cached for preview mode requests
    logger.debug('(api:testing:invalidate-page) skipping invalidate page request as preview mode is enabled');
    return;  
  }

  logger.debug('(api:testing:invalidate-page) parsing cache invalidation request from HTTP body');
  const invalidateCacheDto: ITestingInvalidateCacheDto = TestingInvalidateCacheDtoSchema.cast(await readBody(event));

  const items: { page: AppPage, id?: EntityId }[] = [];
  for(let i = 0; i < invalidateCacheDto.values.length; i++) {
    const dto = invalidateCacheDto.values[i];
    const page = lookupValueOrThrow(AppPage, dto.page) as AppPage;
    items.push({
      page,
      id: dto.id,
    });
  }

  for(let i = 0; i < items.length; i++) {
    const item = items[i];
    await cacheCleanerLogic.invalidatePage('immediate', item.page, item.id);
  }
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: ITestingInvalidateCacheResultDto = {
    success: true
  };
  return result;
}, { logResponseBody: true, authorizedOnly: false, validationSchema: TestingInvalidateCacheDtoSchema, allowedEnvironments: ['test'] });