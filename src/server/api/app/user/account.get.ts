import type { H3Event } from 'h3';
import { AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import type { IUserAccountDto } from '../../../api-definitions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const userLogic = getServerServices()!.getUserLogic();
  const authSession = await getServerSession(event);
  const userId : EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.UNAUTHENTICATED,
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
