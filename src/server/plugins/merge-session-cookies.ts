import { CookieSession, HeaderSetCookie } from '@golobe-demo/shared';
import { splitCookiesString } from 'h3';
import flatten from 'lodash-es/flatten';
import { getServerServices } from '../../helpers/service-accessors';

// KB: temporary workaround for duplicated session data values sent in "set-session" header when using H3 session helpers
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (!event.headers) {
      return;
    }
    const logger = getServerServices()?.getLogger();
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
        logger?.warn(`(nitro:merge-session-cookies) got more that 1 session cookie value, count=${adjustedCookieValues.length}/${allCookies.length}, path=${event.path}`);
      } catch (err: any) {
        logger?.warn(`(nitro:merge-session-cookies) failed to merge session cookie values, count=$${allCookies.length}, path=${event.path}`, err);
      }
    }
  });
});
