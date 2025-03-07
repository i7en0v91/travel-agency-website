import { AppConfig, AppException, AppExceptionCodeEnum, ImageCategory } from '@golobe-demo/shared';
import { Readable } from 'stream';
import type { H3Event } from 'h3';
import { getQuery } from 'ufo';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { extractUserIdFromSession } from '../../utils/auth';
import { getServerSession } from '#auth';
import { getCommonServices, getServerServices } from '../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  const serverServices = getServerServices()!;
  const imageProcessor = serverServices.getImageProcessor(); 
  const imageProvider = serverServices.getImageProvider();
  const imageLogic = serverServices.getImageLogic();

  let url = event.node.req.url;
  if (!url) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'query parameters were not specified',
      'error-stub'
    );
  }

  if (url.includes('&amp;')) {
    url = url.replaceAll('&amp;', '&'); // fix for satori img requests
  }
  const query = getQuery(url);
   
  const isSatori = query?.satori ? true : false;

  const slug = query?.slug?.toString();
  const categoryParam = query?.category?.toString();
  const scaleParam = isSatori ? '1.000' : query?.scale?.toString();

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

  let scale: number;
  if (!scaleParam) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `scale parameter was not specified: slug=${slug}`,
      'error-stub'
    );
  }

  if (!(scale = Number.parseFloat(scaleParam))) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `scale parameter was incorrectly specified: slug=${slug}, scaleParam=${scaleParam}`,
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

  const image = await imageProvider.getImageBytes(undefined, slug, category, scale, event, event.context.preview.mode);
  if (!image) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  }

  if (isSatori && !image.mimeType.includes('jpeg')) {
    try {
      logger.info('converting image to satori acceptable format (JPEG', { slug, mime: image.mimeType });
      image.mimeType = 'image/jpeg';
      image.bytes = await imageProcessor.convert(image.bytes, 'jpeg');
    } catch (err: any) {
      logger.warn('failed to convert image to satori acceptable format (JPEG', err, { slug, mime: image.mimeType });
      throw err;
    }
  }

  if (!isSatori) {
    const modifiedSince = image.modifiedUtc;
    modifiedSince.setMilliseconds(0);
    handleCacheHeaders(event, (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
    {
      maxAge: AppConfig.caching.intervalSeconds,
      modifiedTime: modifiedSince,
      cacheControls: ['must-revalidate']
    } : {
      cacheControls: ['no-cache']
    });
  }

  setHeader(event, 'content-type', image.mimeType);
  setHeader(event, 'content-length', image.bytes.length);
  if (accessCheck === 'unprotected') {
    setHeader(event, 'x-robots-tag', 'index, follow, archive');
  } else {
    setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive');
  }

  return await sendStream(event, Readable.from(image.bytes));
}, { logResponseBody: false, authorizedOnly: false });
