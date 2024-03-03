import { type IUserSession } from '../shared/interfaces';

export function useUserSession () : IUserSession {
  const logger = CommonServicesLocator.getLogger();
  logger.debug('(user-session) use');
  return CommonServicesLocator.getUserSession();
}
