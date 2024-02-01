import remove from 'lodash/remove';
import { type IAppLogger } from '../shared/applogger';
import { getNewSessionValues, buildSessionDto, parseSessionDto } from '../shared/session';
import { type SessionValues, type SessionValue, type IUserSessionClient, type UserSession } from '../shared/interfaces';
import { NuxtDataKeys, WebApiRoutes, CookieNames } from '../shared/constants';
import { type ISessionDto } from '../server/dto';
import { get, post, del } from './rest-utils';

export class UserSessionOnClient implements IUserSessionClient {
  serverSession: UserSession | undefined; // server-side session (stored in DB)
  logger: IAppLogger;

  public static inject = ['logger'] as const;
  constructor (logger: IAppLogger) {
    this.logger = logger;
  }

  ensureServerSession = async (): Promise<UserSession> => {
    this.logger.debug('(session:client) ensuring server session');

    const sessionId = useCookie(CookieNames.SessionId).value?.toString();
    let needSync = false;
    if (!this.serverSession || !sessionId) { // user may has cleaned cookies manually
      needSync = true;
      if (sessionId) {
        this.logger.verbose('(session:client) initializing server session values');
        const sessionDataKey = `${NuxtDataKeys.BrowserSession}_${sessionId}`;
        const nuxtApp = useNuxtApp();
        this.serverSession = nuxtApp.payload[sessionDataKey] as UserSession;
        if (this.serverSession) {
          this.logger.verbose(`(session:client) server session values initialized: sessionId=${this.serverSession.sessionId}, values=${JSON.stringify(this.serverSession.values)}`);
        } else {
          this.logger.verbose('(session:client) server session values are not available');
        }
      } else {
        this.logger.info('(session:client) session has expired');
        this.serverSession = await this.refreshServerSession();
      }
    } else if (sessionId !== this.serverSession!.sessionId) {
      needSync = true;
      this.logger.info('(session:client) session id has been changed');
      this.serverSession.sessionId = sessionId;
    }

    if (this.serverSession && needSync) {
      try {
        this.logger.verbose(`(session:client) synchronizing server session, sessionId=${this.serverSession.sessionId}`);

        const changed = false;
        /*
        // patch server session values with actual from local client session
        const locale = this.i18n.locale.value as Locale;
        changed ||= this.setValueInCollection(this.serverSession!.values, SessionConstants.LocaleKey, locale);
        */

        if (changed) {
          await this.sendAllSessionValues(this.serverSession);
          this.logger.info(`(session:client) session synchronized, sessionId=${this.serverSession?.sessionId}`);
        } else {
          this.logger.info(`(session:client) session already in-sync, sessionId=${this.serverSession?.sessionId}`);
        }
      } catch (err: any) {
        this.logger.warn('(session:client) failed to synchronize server session', err);
      }
    }

    this.logger.debug(`(session:client) current session accessed, sessionId=${this.serverSession.sessionId}`);
    return this.serverSession;
  };

  refreshServerSession = async (): Promise<UserSession> => {
    try {
      this.logger.info('(session:client) refreshing server session');
      const sessionDto = await get<ISessionDto>(WebApiRoutes.SessionManagement, null, 'no-cache', 'throw');
      if (sessionDto) {
        const session = parseSessionDto(sessionDto);
        this.logger.info(`(session:client) server session refreshed, sessionId=${session.sessionId}, values=${(session.values)}`);
        return session;
      }
    } catch (err: any) {
      this.logger.warn('(session:client) failed to refesh server session, falling back to default', err);
    }

    // default session fallback
    const values = getNewSessionValues();
    const sessionId = new Date().getTime().toString();
    this.logger.warn(`(session:client) fictive client session was initialized locally; (fictive-) sessionId=${sessionId}, values=${(values)}`);
    return { sessionId, values };
  };

  sendAllSessionValues = async (session: UserSession): Promise<void> => {
    try {
      const sessionDto: ISessionDto = buildSessionDto(session);
      this.logger.info(`(session:client) sending all session values to server: sessionId=${session.sessionId}, values=${(session.values)}`);
      await post(WebApiRoutes.SessionManagement, null, sessionDto, 'throw');
    } catch (err: any) {
      this.logger.warn(`(session:client) failed to send all session values: sessionId=${session.sessionId}`, err);
    }
  };

  setValueInCollection = (sessionValues: SessionValues, key: string, value: SessionValue | undefined): boolean => {
    if (value) {
      const entry = sessionValues.find(t => t[0] === key);
      if (entry) {
        if (entry[1] !== value) {
          entry[1] = value;
          return true;
        }
        return false;
      } else {
        sessionValues.push([key, value]);
        return true;
      }
    } else {
      return remove(sessionValues, t => t[0] === key).length > 0;
    }
  };

  setServerValueSafe = async (key: string, value: SessionValue | undefined) : Promise<void> => {
    try {
      const session = await this.ensureServerSession();
      this.setValueInCollection(session.values, key, value);
      if (value) {
        await post(WebApiRoutes.SessionManagement, { key }, value.toString());
      } else {
        await del(WebApiRoutes.SessionManagement, { key });
      }
    } catch (error: any) {
      this.logger.warn(`(session:client) failed to set session value on server: key=${key}, value=${value}`, error);
    }
  };

  setValue = (key: string, value: SessionValue | undefined, persistOnServer: boolean) : Promise<void> => {
    this.logger.verbose(`(session:client) setting session value: key=${key}, value=${value}, persistOnServer=${persistOnServer}`);
    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error: any) {
      this.logger.warn(`(session:client) failed to set session value in local storage: key=${key}, value=${value}`, error);
    }

    if (persistOnServer) {
      this.setServerValueSafe(key, value);
    }

    this.logger.verbose(`(session:client) session value was set: key=${key}`);
    return new Promise(resolve => resolve());
  };

  getValue = (key: string): SessionValue | undefined => {
    const sessionId = this.serverSession?.sessionId;
    this.logger.debug(`(session:client) accessing session value key=${key}, sessionId=${sessionId}`);

    const result = localStorage.getItem(key);

    this.logger.debug(`(session:client) session value was read key=${key}, value=${result ?? '[empty]'}, sessionId=${sessionId}`);
    return result ?? undefined;
  };

  ensureSession = async (): Promise<UserSession> => {
    return await this.ensureServerSession();
  };
};
