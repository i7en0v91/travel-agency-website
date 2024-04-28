import { splitCookiesString } from 'h3';
import flatten from 'lodash-es/flatten';
import { type IAppLogger } from '../../shared/applogger';
import { CookieSession, HeaderSetCookie } from '../../shared/constants';

// KB: temporary workaround for duplicated session data values sent in "set-session" header when using H3 session helpers
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (!event.headers) {
      return;
    }
    const logger = (globalThis as any)?.ServerServicesLocator?.getLogger() as IAppLogger | undefined;
    const allHeaders = event.node.res.getHeaders();
    const setCookieValues = allHeaders[HeaderSetCookie];
    if (!setCookieValues || setCookieValues.length === 0) {
      return;
    }

    const allCookies = flatten([...setCookieValues].map(h => splitCookiesString(h)));
    const golobeSessionCookies = allCookies.filter(c => c.startsWith(`${CookieSession}`));
    if (golobeSessionCookies.length > 1) {
      try {
        // TODO: better would be to parse & merge cookie values into one
        const adjustedCookieValues = allCookies.filter(c => !c.startsWith(`${CookieSession}`));
        adjustedCookieValues.push(golobeSessionCookies[golobeSessionCookies.length - 1]);
        setHeader(event, HeaderSetCookie, adjustedCookieValues);
        logger?.warn(`(nitro:merge-session-cookies) got more that 1 session cookie value, adjusted: before=${JSON.stringify(setCookieValues)}, after=${JSON.stringify(adjustedCookieValues)}, path=${event.path}`);
      } catch (err: any) {
        logger?.warn(`(nitro:merge-session-cookies) failed to merge session cookie values, set-cookie=${JSON.stringify(setCookieValues)}, path=${event.path}`);
      }
    }
  });
});
