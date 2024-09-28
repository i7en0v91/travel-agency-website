import { AppConfig } from '@golobe-demo/shared';
import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IImageDetailsDto } from '../../../api-definitions';
import max from 'lodash-es/max';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const authFormImageLogic = getServerServices()!.getAuthFormImageLogic();
  const imageInfos = await authFormImageLogic.getAllImages(event, event.context.preview.mode);
  const modifiedSince = max(imageInfos.map(x => x.modifiedUtc))!;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, 
    (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    }
  );
  setHeader(event, 'content-type', 'application/json');

  const result: IImageDetailsDto[] = imageInfos.map((imageInfo) => {
    return {
      slug: imageInfo.image.slug,
      stubCssStyle: [],
      invertForDarkTheme: false
    };
  });
  return result;
}, { logResponseBody: false, authorizedOnly: false });
