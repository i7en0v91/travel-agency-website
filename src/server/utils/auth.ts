import type { getServerSession } from '#auth';
import type { EntityId } from '../backend/app-facade/interfaces';
import isNumber from 'lodash-es/isNumber';

export function extractUserIdFromSession(session: Awaited<ReturnType<typeof getServerSession>> | null | undefined): EntityId | undefined {
  if(!session) {
    return undefined;
  }

  const userIdParam = (session as any)?.id as any;
  let userId : EntityId | undefined = userIdParam;
  if (userIdParam && isNumber(userIdParam)) {
    userId = userIdParam.toString();
  }
  return userId;
}