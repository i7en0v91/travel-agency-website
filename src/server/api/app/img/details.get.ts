import { AppConfig, AppException, AppExceptionCodeEnum, ImageCategory } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IImageDetailsDto } from '../../../api-definitions';
import type { H3Event } from 'h3';
import toPairs from 'lodash-es/toPairs';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageLogic = getServerServices()!.getImageLogic();

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

  const accessCheck = await imageLogic.checkAccess(undefined, slug, category, event.context.preview.mode, userId);
  if (accessCheck === undefined) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  } else if (accessCheck === 'denied') {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHENTICATED,
      'authorization required to access',
      'error-stub'
    );
  }

  const imageInfo = await imageLogic.findImage(undefined, slug, category, event, event.context.preview.mode);
  if (!imageInfo) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  }

  const modifiedSince = imageInfo.file.modifiedUtc;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    }
  );
  setHeader(event, 'content-type', 'application/json');

  const result: IImageDetailsDto = {
    slug: imageInfo.slug,
    stubCssStyle: imageInfo.stubCssStyle ? toPairs(imageInfo.stubCssStyle).map(p => [p[0], p[1].toString()]) : [],
    invertForDarkTheme: imageInfo.invertForDarkTheme
  };
  return result;
}, { logResponseBody: true, authorizedOnly: false });
