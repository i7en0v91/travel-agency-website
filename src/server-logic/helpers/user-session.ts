import { H3Event } from 'h3';
import { type UserSession, type SessionValue, type IUserSessionServer } from '../../shared/interfaces';
import { setValue as setValueServer, getValue as getValueServer, getSession as getSessionServer } from '../session/server';
import { AppException, AppExceptionCodeEnum } from './../../shared/exceptions';

export class UserSessionOnServer implements IUserSessionServer {
  async setValue (key: string, value: SessionValue | undefined) : Promise<void> {
    await setValueServer(this.getRequestEventOrThrow(), key, value);
  };

  getValue (key: string): SessionValue | undefined {
    return getValueServer(this.getRequestEventOrThrow(), key);
  };

  async ensureSession (): Promise<UserSession> {
    return await getSessionServer(this.getRequestEventOrThrow());
  };

  private getRequestEventOrThrow (): H3Event {
    const requestEvent = useRequestEvent();
    if (!requestEvent) {
      // session access may happen on the very first request so that logger wouldn't have been injected into IoC container yet
      ServerServicesLocator?.getLogger()?.error('(UserSessionOnServer) request event context is not initialized');
      throw new AppException(
        AppExceptionCodeEnum.UNKNOWN,
        'internal server error',
        'error-page');
    }
    return requestEvent;
  }
};
