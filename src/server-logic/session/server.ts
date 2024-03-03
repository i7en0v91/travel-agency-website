import { getCookie, setCookie, H3Event } from 'h3';
import { type CookieSerializeOptions } from 'cookie-es';
import dayjs from 'dayjs';
import remove from 'lodash-es/remove';
import keys from 'lodash-es/keys';
import { CookieNames, type Locale, DbConcurrencyVersions, NuxtDataKeys, WebApiRoutes } from '../../shared/constants';
import { getNewSessionValues } from '../../shared/session';
import { executeWithConcurrentUpdateRetries } from '../helpers/db';
import { type ISessionLogic, type SessionValues, type SessionId, type SessionValue, type Session, type IConcurrentlyModifyingEntity } from '../../shared/interfaces';
import AppConfig from '../../appconfig';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { type IAppLogger } from '../../shared/applogger';

function getCookieOptions () : CookieSerializeOptions {
  const expires = dayjs().utc().add(AppConfig.userSession.expirationDays, 'day');
  return {
    expires: expires.toDate(),
    httpOnly: false,
    sameSite: true,
    secure: true
  };
};

async function createNewSession (event: H3Event): Promise<Session> {
  const logger = ServerServicesLocator.getLogger();
  const sessionLogic: ISessionLogic = ServerServicesLocator.getSessionLogic();
  const sessionId : SessionId = sessionLogic.createNewSessionId();
  const values = getNewSessionValues();
  const session: Session = { sessionId, values, version: DbConcurrencyVersions.DraftVersion };
  await sessionLogic.persistSession(session);
  logger.verbose(`(session:server) session created, sessionId=${session.sessionId}, url=${event.node.req.url}`);
  return session;
};

function getCurrentSession (event: H3Event): Session {
  const logger = ServerServicesLocator.getLogger();
  const session = event.context.userSession as Session;
  if (!session) {
    const errMsg = '(session:server) non-initialized session access';
    logger.warn(errMsg);
    throw new Error(errMsg);
  }

  return session;
}

export async function setValue (event: H3Event, key: string, value: SessionValue | undefined): Promise<void> {
  const logger = ServerServicesLocator.getLogger();
  const sessionLogic: ISessionLogic = ServerServicesLocator.getSessionLogic();

  try {
    await executeWithConcurrentUpdateRetries(
      () => { return getCurrentSession(event); },
      async () => { await resetSession(event); },
      async (entity: IConcurrentlyModifyingEntity) => {
        const session = entity as Session;
        logger.verbose(`(session:server) setting session value, sessionId=${session.sessionId}, key=${key}, value=${value}`);
        if (value) {
          const entry = session.values.find(t => t[0] === key);
          if (entry) {
            entry[1] = value.toString();
          } else {
            session.values.push([key, value]);
          }
        } else {
          remove(session.values, t => t[0] === key);
        }
        await sessionLogic.persistSession(session);
      });
  } catch (err: any) {
    const sessionId = getCurrentSession(event)?.sessionId;
    logger.warn(`(session:server) failed to persist session: sessionId=${sessionId}`, err);
  }
};

export async function setAllValues (event: H3Event, values: SessionValues): Promise<void> {
  const logger = ServerServicesLocator.getLogger();
  const sessionLogic: ISessionLogic = ServerServicesLocator.getSessionLogic();

  try {
    await executeWithConcurrentUpdateRetries(
      () => { return getCurrentSession(event); },
      async () => { await resetSession(event); },
      async (entity: IConcurrentlyModifyingEntity) => {
        const session = entity as Session;
        logger.verbose(`(session:server) setting all session values collection, ${(session)}`);
        session.values = values;
        await sessionLogic.persistSession(session);
      }
    );
  } catch (err: any) {
    const sessionId = getCurrentSession(event)?.sessionId;
    logger.warn(`(session:server) failed to persist session: sessionId=${sessionId}`, err);
  }
};

export function getValue (event: H3Event, key: string): SessionValue | undefined {
  const logger = ServerServicesLocator.getLogger();

  const session = getCurrentSession(event);
  const result = session.values.find(t => t[0] === key)?.[1];

  logger.debug(`(session:server) session value was read key=${key}, sessionId=${session.sessionId}, value=${result ?? '[empty]'}`);
  return result ? (result as SessionValue) : result;
};

export function getSession (event: H3Event): Session {
  return getCurrentSession(event);
};

export function getLocaleFromUrl (url: string) : Locale | undefined {
  const logger = (globalThis as any).CommonServicesLocator.getLogger() as IAppLogger;

  logger?.debug(`(session:server) detecting locale from url: url=${url}`);
  if (url.startsWith(`${WebApiRoutes.Logging}`) ||
    url.startsWith(`${WebApiRoutes.Authentication}`)) {
    return undefined;
  }

  let result: Locale = 'en';
  if (url.startsWith(`/${<Locale>'ru'}`)) {
    result = <Locale>'ru';
  } else if (url.startsWith(`/${<Locale>'fr'}`)) {
    result = <Locale>'fr';
  }

  return result;
}

function injectSessionIntoNuxtPayload (event: H3Event) {
  if (event && !event.path.startsWith(WebApiRoutes.Prefix)) {
    const session = event.context.userSession as Session;
    if (session) {
      const nuxtApp = useNuxtApp();
      keys(nuxtApp!.payload)
        .filter(k => k.startsWith(NuxtDataKeys.BrowserSession))
        .forEach((k) => { nuxtApp!.payload[k] = undefined; });
      const sessionDataKey = `${NuxtDataKeys.BrowserSession}_${session.sessionId}`;
      nuxtApp!.payload[sessionDataKey] = session;
    }
  }
}

async function initSession (event: H3Event) : Promise<Session> {
  const logger = ServerServicesLocator.getLogger();
  const sessionLogic: ISessionLogic = ServerServicesLocator.getSessionLogic();

  let sessionCookie: string | undefined;
  let session: Session | undefined;
  logger.verbose('(session:server) initializing session');
  try {
    sessionCookie = getCookie(event, CookieNames.SessionId)?.trim();
    if (!sessionCookie) {
      logger.info('(session:server) session cookie absent or empty, starting new session');
      session = await createNewSession(event);
    } else {
      const sessionId = sessionCookie;
      session = await sessionLogic.findSession(sessionId);
      if (!session) {
        logger.info(`(session:server) cannot find session, creating new: sessionId=${sessionId}`);
        session = await createNewSession(event);
      }
    }

    logger.verbose(`(session:server) session initialized: ${(JSON.stringify(session))}`);
    return session;
  } catch (err: any) {
    const msg = `(session:server) failed to initialize session, session cookie=${sessionCookie}`;
    logger.error(msg, err);
    throw new AppException(AppExceptionCodeEnum.SESSION_INIT_FAILED, msg, 'error-page');
  }
};

async function resetSession (event: H3Event): Promise<void> {
  const sessionLogic: ISessionLogic = ServerServicesLocator.getSessionLogic();
  const currentSession = event.context.userSession as Session;
  if (currentSession) {
    await sessionLogic.clearSessionCache(currentSession.sessionId);
    event.context.userSession = undefined;
  }
  await initializeSession(event);
  injectSessionIntoNuxtPayload(event);
}

export async function initializeSession (event: H3Event): Promise<void> {
  const logger = ServerServicesLocator.getLogger();

  let currentSession: Session | undefined = event.context.userSession as Session;
  if (!currentSession) {
    currentSession = await initSession(event);
    event.context.userSession = currentSession;
  } else {
    logger.debug(`(session:server) session already initialized, sessionId=${currentSession.sessionId}`);
  }

  setCookie(event, CookieNames.SessionId, currentSession.sessionId, getCookieOptions());

  // will fail in middleware
  // injectSessionIntoNuxtPayload();
};
