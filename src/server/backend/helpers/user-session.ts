import { randomBytes } from 'crypto';
import type { H3Event } from 'h3';
import get from 'lodash-es/get';
import fromPairs from 'lodash-es/fromPairs';
import { type UserSession, type SessionValue, type SessionValues } from './../app-facade/interfaces';
import { CookieSession, AppConfig } from './../app-facade/implementation';

function createNewSessionId (): string {
  const result = randomBytes(32).toString('base64');
  (CommonServicesLocator as any)?.logger?.debug(`(user-session) new sessionId generated, sessionId=${result}`);
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
    const errMsg = `(user-session) non-initialized session access, ${event.path}`;
    (CommonServicesLocator as any)?.logger?.warn(errMsg);
    throw new Error(errMsg);
  }
  return session;
}

export async function getSession (event: H3Event | undefined): Promise<UserSession | undefined> {
  const logger = (ServerServicesLocator as any)?.getLogger();
  logger.debug(`(user-session) get, path=${event?.path ?? '[undefined]'}`);
  if (!event) {
    logger?.warn('(user-session) get result, request event empty');
    return undefined;
  }

  const h3Session = await getH3Session(event);

  logger?.debug(`(user-session) get result, path=${event.path}, sessionId=${h3Session.id}`);
  return {
    sessionId: h3Session.id!,
    values: h3Session.data
  };
}

export async function getValue (event: H3Event | undefined, key: string): Promise<SessionValue | undefined> {
  const logger = (ServerServicesLocator as any)?.getLogger();
  logger?.debug(`(user-session) get value, path=${event?.path ?? '[undefined]'}, key=${key}`);

  const session = await getSession(event);
  const result = session?.values ? get(session.values, key) : undefined;

  logger?.debug(`(user-session) get value result, path=${event?.path ?? '[undefined]'}, key=${key}, sessionId=${session?.sessionId}, exists=${result !== undefined ? 'true' : 'false'}`);
  return result as SessionValue;
};

export async function setValue (event: H3Event | undefined, key: string, value: SessionValue | undefined): Promise<void> {
  const logger = (ServerServicesLocator as any)?.getLogger();
  logger?.debug(`(user-session) set, path=${event?.path ?? '[undefined]'}, key=${key}, nonEmpty=${value === undefined ? 'false' : 'true'}`);
  if (!event) {
    logger?.warn(`(user-session) set failed, request event empty, key=${key}, nonEmpty=${value === undefined ? 'false' : 'true'}`);
    return;
  }

  const h3Session = await getH3Session(event);
  await h3Session.update(fromPairs([[key, value]]));

  logger?.debug(`(user-session) set completed, path=${event?.path ?? '[undefined]'}, key=${key}, nonEmpty=${value === undefined ? 'false' : 'true'}`);
}
