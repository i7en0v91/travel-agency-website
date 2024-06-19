import { Readable } from 'stream';
import type { H3Event } from 'h3';
import { getQuery } from 'ufo';
import sharp from 'sharp';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { ImageCategory } from '../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { getServerSession } from '#auth';
import AppConfig from './../../appconfig';
import { extractUserIdFromSession } from '../utils/auth';

async function convertToJpeg (bytes: Buffer): Promise<Buffer> {
  const sharpObj = sharp(bytes);
  const metadata = await sharpObj.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('failed to parse image');
  }
  return sharpObj.jpeg().toBuffer();
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = CommonServicesLocator.getLogger();
  const imageBytesProvider = ServerServicesLocator.getImageBytesProvider();
  const imageLogic = ServerServicesLocator.getImageLogic();

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

  const image = await imageBytesProvider.getImageBytes(undefined, slug, category, scale, event);
  if (!image) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  }

  if (isSatori && !image.mimeType.includes('jpeg')) {
    try {
      logger.info(`(api:img) converting image to satori acceptable format (JPEG), slug=${slug}, mime=${image.mimeType}`);
      image.mimeType = 'image/jpeg';
      image.bytes = await convertToJpeg(image.bytes);
    } catch (err: any) {
      logger.warn(`(api:img) failed to convert image to satori acceptable format (JPEG), slug=${slug}, mime=${image.mimeType}`, err);
      throw err;
    }
  }

  if (!isSatori) {
    const modifiedSince = image.modifiedUtc;
    modifiedSince.setMilliseconds(0);
    handleCacheHeaders(event, AppConfig.caching.imagesCachingSeconds ? {
      maxAge: AppConfig.caching.imagesCachingSeconds,
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
