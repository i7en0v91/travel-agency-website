import { AppException, AppExceptionCodeEnum, type EntityId, ImageCategory } from '@golobe-demo/shared';
import { CroppingImageFormat } from '../../../../helpers/constants';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import type { IImageUploadResultDto } from '../../../api-definitions';
import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import isBuffer from 'lodash-es/isBuffer';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const userLogic = getServerServices()!.getUserLogic();

  const query = getQuery(event);

  const authSession = await getServerSession(event);
  const userId: EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHENTICATED,
      'authorization required to access',
      'error-stub'
    );
  }

  const fileName = query.fileName?.toString();

  const category = query.category as ImageCategory;
  if (!category || !Object.values(ImageCategory).includes(category)) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `category parameter was not (correctly) specified: fileName=${fileName}, category=${category}`,
      'error-stub'
    );
  }

  const imageBytesRaw = (await readRawBody(event, 'binary') as any);
  if (!imageBytesRaw) {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `empty image bytes: userId=${userId}`,
      'error-stub'
    );
  }

  let imageBytes: Buffer;
  if (isString(imageBytesRaw)) {
    imageBytes = Buffer.from(imageBytesRaw as string, 'binary');
  } else if (isBuffer(imageBytesRaw)) {
    imageBytes = imageBytesRaw as Buffer;
  } else {
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      `unexpected image data format: userId=${userId}`,
      'error-stub'
    );
  }

  const result: IImageUploadResultDto = await userLogic.uploadUserImage(userId, category, imageBytes, CroppingImageFormat, fileName, event);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return result;
}, { logResponseBody: true, authorizedOnly: true });
