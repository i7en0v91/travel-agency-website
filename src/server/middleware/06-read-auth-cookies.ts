import { CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken, HeaderCookies, type IAppLogger } from '@golobe-demo/shared';
import { getRequestHeader } from 'h3';
import flatten from 'lodash-es/flatten';
import { getServerSession } from '#auth';
import { getCommonServices } from '../../helpers/service-accessors';

export default defineEventHandler(async (event) => {
  const logger = getCommonServices().getLogger() as IAppLogger;
  if((event.context.authCookies?.length ?? 0) > 0) {
    logger.debug(`(read-auth-cookies) already added, count=${event.context.authCookies?.length ?? 0}`);
    return;
  }

  const authCookieNames = [CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken];

  let inputAuthCookies: string[] | undefined;
  const inputCookies = event ? (getRequestHeader(event, HeaderCookies) ?? (event.node.req.headers.cookie)) : undefined;

  if (inputCookies !== undefined && inputCookies.length > 0) {
    const allCookies = flatten(inputCookies.split(';').map(c => c.trim()));
    inputAuthCookies = allCookies.filter(c => authCookieNames.some(ac => c.trim().startsWith(ac)));
  }

  if ((inputAuthCookies?.length ?? 0) === 0) {
    logger.debug('(read-auth-cookies) not present');
    return;
  }

  event.context.authCookies = inputAuthCookies;
  try {
    event.context.authenticated = !!(await getServerSession(event));
  } catch(err: any) {
    logger.warn(`(read-auth-cookies) failed to obtain server session, url=${event.node.req.url}`, err);
  } finally {
    logger.debug(`(read-auth-cookies) added, count=${inputAuthCookies!.length}, isAuth=${event.context.authenticated}`);
  }
});
