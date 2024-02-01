import { Readable } from 'stream';
import { H3Event } from 'h3';
import isString from 'lodash/isString';
import onHeaders from 'on-headers';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { WebApiRoutes } from '../../shared/constants';
import { type EntityId, ImageCategory } from '../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const imageBytesProvider = ServerServicesLocator.getImageBytesProvider();
  const imageLogic = ServerServicesLocator.getImageLogic();

  const query = getQuery(event);
  const slug = query?.slug?.toString();
  const categoryParam = query?.category?.toString();
  const scaleParam = query?.scale?.toString();

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
      `category parameter was not (correctly) specified: slug=${slug}`,
      'error-stub'
    );
  }

  let scale: number;
  if (!scaleParam || !(scale = Number.parseFloat(scaleParam))) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `scale parameter was not (correctly) specified: slug=${slug}`,
      'error-stub'
    );
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const accessCheck = await imageLogic.checkAccess(slug, category, userId);
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

  const image = await imageBytesProvider.getImageBytes(slug, category, scale);
  if (!image) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      `image not found: slug=${slug}`,
      'error-stub'
    );
  }

  const modifiedSince = image.modifiedUtc;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, {
    maxAge: WebApiRoutes.ImageCacheLatency,
    modifiedTime: modifiedSince,
    cacheControls: ['must-revalidate']
  });

  onHeaders(event.node.res, () => {
    const response = event.node.res;
    response.setHeader('content-type', image.mimeType ?? 'image');
    response.setHeader('content-length', image.bytes.length);
    if (accessCheck === 'unprotected') {
      response.setHeader('x-robots-tag', 'index, follow, archive');
    } else {
      response.setHeader('x-robots-tag', 'noindex, nofollow, noarchive');
    }
  });

  return await sendStream(event, Readable.from(image.bytes));
}, { logResponseBody: false, authorizedOnly: false });
