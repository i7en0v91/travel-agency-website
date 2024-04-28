import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import isBuffer from 'lodash-es/isBuffer';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type EntityId, ImageCategory } from '../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { type IImageUploadResultDto } from '../../dto';
import { CroppingImageFormat } from '../../../shared/constants';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const userLogic = ServerServicesLocator.getUserLogic();

  const query = getQuery(event);

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHORIZED,
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

  const result: IImageUploadResultDto = await userLogic.uploadUserImage(userId, category, imageBytes, CroppingImageFormat, fileName);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return result;
}, { logResponseBody: true, authorizedOnly: true });
