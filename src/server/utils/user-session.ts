import { type UserSession, type SessionValue, type SessionValues, CookieSession, AppConfig } from '@golobe-demo/shared';
import { randomBytes } from 'crypto';
import type { H3Event } from 'h3';
import get from 'lodash-es/get';
import fromPairs from 'lodash-es/fromPairs';
import { getCommonServices } from '../../helpers/service-accessors';
import once from 'lodash-es/once';

const getLogger = once(() => getCommonServices().getLogger().addContextProps({ component: 'UserSession' }));

function createNewSessionId (): string {
  const result = randomBytes(32).toString('base64');
  getLogger()?.debug('new sessionId generated', { sessionId: result });
  return result;
}

async function getH3Session (event: H3Event): Promise<ReturnType<typeof useSession<SessionValues>>> {
  const maxAge = 60 * 60 * 24 * AppConfig.userSession.expirationDays;
  const session = await useSession<SessionValues>(event, {
    password: AppConfig.userSession.encryptionKey,
    name: CookieSession,
    generateId: createNewSessionId,
    cookie: {
      httpOnly: true,
      secure: AppConfig.userSession.secure,
      sameSite: 'strict',
      maxAge,
      path: '/'
    },
    maxAge
  });
  if (!session?.id) {
    getLogger()?.warn('non-initialized session access', undefined, { path: event.path });
    throw new Error('non-initialized session access');
  }
  return session;
}

export async function getUserSession (event: H3Event | undefined): Promise<UserSession | undefined> {
  const logger = getLogger();
  logger?.debug('get', { path: event?.path ?? '[undefined]' });
  if (!event) {
    logger?.warn('get result, request event empty');
    return undefined;
  }

  const h3Session = await getH3Session(event);

  logger?.debug('get result', { path: event.path, sessionId: h3Session.id });
  return {
    sessionId: h3Session.id!,
    values: h3Session.data
  };
}

export async function getUserSessionValue (event: H3Event | undefined, key: string): Promise<SessionValue | undefined> {
  const logger = getLogger();
  logger?.debug('get value', { path: event?.path ?? '[undefined]', key });

  const session = await getUserSession(event);
  const result = session?.values ? get(session.values, key) : undefined;

  logger?.debug('get value result', { path: event?.path ?? '[undefined]', key, sessionId: session?.sessionId });
  return result as SessionValue;
};

export async function setUserSessionValue (event: H3Event | undefined, key: string, value: SessionValue | undefined): Promise<void> {
  const logger = getLogger();
  logger?.debug('set', { path: event?.path ?? '[undefined]', key, value });
  if (!event) {
    logger?.warn('set failed, request event empty', undefined, { key, value });
    return;
  }

  const h3Session = await getH3Session(event);
  await h3Session.update(fromPairs([[key, value]]));

  logger?.debug('set completed', { path: event?.path ?? '[undefined]', key, value });
}
