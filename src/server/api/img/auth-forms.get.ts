import type { H3Event } from 'h3';
import max from 'lodash-es/max';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type IImageDetailsDto } from '../../dto';
import AppConfig from '../../../appconfig';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const authFormImageLogic = ServerServicesLocator.getAuthFormImageLogic();
  const imageInfos = await authFormImageLogic.getAllImages(event);
  const modifiedSince = max(imageInfos.map(x => x.modifiedUtc))!;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event,  AppConfig.caching.imagesCachingSeconds ? {
    maxAge: AppConfig.caching.imagesCachingSeconds,
    modifiedTime: modifiedSince,
    cacheControls: ['must-revalidate']
  } : {
    cacheControls: ['no-cache']
  });
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
