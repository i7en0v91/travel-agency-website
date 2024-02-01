import { type UserSession, type SessionValue, type IUserSessionServer } from '../../shared/interfaces';
import { setValue as setValueServer, getValue as getValueServer, getSession as getSessionServer } from '../session/server';

export class UserSessionOnServer implements IUserSessionServer {
  setValue = async function (key: string, value: SessionValue | undefined) : Promise<void> {
    await setValueServer(useRequestEvent(), key, value);
  };

  getValue = function (key: string): SessionValue | undefined {
    return getValueServer(useRequestEvent(), key);
  };

  ensureSession = async function (): Promise<UserSession> {
    return await getSessionServer(useRequestEvent());
  };
};
