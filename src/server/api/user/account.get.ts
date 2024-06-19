import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type EntityId } from '../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { type IUserAccountDto } from '../../dto';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const userLogic = ServerServicesLocator.getUserLogic();
  const authSession = await getServerSession(event);
  const userId : EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHORIZED,
      'authorization required to access',
      'error-stub'
    );
  }

  const user = await userLogic.getUser(userId, 'profile', event);
  if (!user) {
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      'user not found',
      'error-stub'
    );
  }

  const modifiedSince = user.modifiedUtc;
  modifiedSince.setMilliseconds(0);
  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  const result: IUserAccountDto = {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    coverSlug: user.cover?.slug,
    coverTimestamp: user.cover?.file.modifiedUtc.getTime(),
    avatarSlug: user.avatar?.slug,
    avatarTimestamp: user.avatar?.file.modifiedUtc.getTime(),
    emails: user.emails?.map(x => x.email) ?? []
  };
  return result;
}, { logResponseBody: false, authorizedOnly: true });
