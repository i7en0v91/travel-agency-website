import { CachedResultsInAppServicesEnabled, AppConfig } from '@golobe-demo/shared';
import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from './../../../utils/webapi-event-handler';
import { type IImageCategoryDto } from './../../../api-definitions';
import { getServerServices } from './../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageCategoryLogic = getServerServices()!.getImageCategoryLogic();
  const allCategoryInfos = Array.from((await imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).entries()).map(e => e[1]);

  const modifiedSince = new Date(Math.max(...allCategoryInfos.map(c => c.modifiedUtc.getTime())));
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    });

  setHeader(event, 'content-type', 'application/json');

  return allCategoryInfos.map((item) => {
    const mapped: IImageCategoryDto = {
      id: item.id,
      kind: item.kind,
      width: item.width,
      height: item.height
    };
    return mapped;
  });
}, { logResponseBody: true, authorizedOnly: false });
