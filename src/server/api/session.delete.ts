import { setValue } from '../../server-logic/session/server';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { defineWebApiEventHandler } from './../utils/webapi-event-handler';

export default defineWebApiEventHandler(async (event) => {
  const query = getQuery(event);
  const key = query.key as string;
  if (!key) {
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'session key was not specified', 'error-page');
  }
  await setValue(event, key, undefined);
}, { logResponseBody: false, authorizedOnly: false });
