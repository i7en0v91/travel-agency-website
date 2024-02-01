import keys from 'lodash/keys';
import { type IUserSession, type Session } from '../shared/interfaces';
import { NuxtDataKeys, WebApiRoutes } from '../shared/constants';

function injectSessionIntoNuxtPayload () {
  const event = useRequestEvent();
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

/**
 * @param injectIntoSsrPayload (server-side only) whether to serialize session values into HTML page and
 * pass them to client. Yet, local storage values will still have higher priority over server versions
 */
export function useUserSession (injectIntoSsrPayload = true) : IUserSession {
  const userSession = CommonServicesLocator.getUserSession();
  if (process.server && injectIntoSsrPayload) {
    injectSessionIntoNuxtPayload();
  }
  return userSession;
}
