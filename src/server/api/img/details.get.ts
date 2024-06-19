import type { H3Event } from 'h3';
import toPairs from 'lodash-es/toPairs';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { ImageCategory } from '../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { type IImageDetailsDto } from '../../dto';
import { getServerSession } from '#auth';
import AppConfig from './../../../appconfig';
import { extractUserIdFromSession } from './../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageLogic = ServerServicesLocator.getImageLogic();

  const query = getQuery(event);
  const slug = query?.slug?.toString();
  const categoryParam = query?.category?.toString();

  if (!slug) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'slug parameter was not specified',
      'error-stub'
    );
  }

  const category = categoryParam as ImageCategory;
  if (!category || !Object.values(ImageCategory).includes(category)) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `category parameter was not (correctly) specified: slug=${slug}, category=${category}`,
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);

  const accessCheck = await imageLogic.checkAccess(undefined, slug, category, userId);
  if (accessCheck === undefined) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  } else if (accessCheck === 'denied') {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHORIZED,
      'authorization required to access',
      'error-stub'
    );
  }

  const imageInfo = await imageLogic.findImage(undefined, slug, category, event);
  if (!imageInfo) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  }

  const modifiedSince = imageInfo.file.modifiedUtc;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, AppConfig.caching.imagesCachingSeconds ? {
    maxAge: AppConfig.caching.imagesCachingSeconds,
    modifiedTime: modifiedSince,
    cacheControls: ['must-revalidate']
  } : {
    cacheControls: ['no-cache']
  });
  setHeader(event, 'content-type', 'application/json');

  const result: IImageDetailsDto = {
    slug: imageInfo.slug,
    stubCssStyle: imageInfo.stubCssStyle ? toPairs(imageInfo.stubCssStyle).map(p => [p[0], p[1].toString()]) : [],
    invertForDarkTheme: imageInfo.invertForDarkTheme
  };
  return result;
}, { logResponseBody: true, authorizedOnly: false });
