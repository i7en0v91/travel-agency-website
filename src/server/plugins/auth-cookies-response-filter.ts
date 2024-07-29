import { splitCookiesString } from 'h3';
import flatten from 'lodash-es/flatten';
import { type IAppLogger } from '../../shared/applogger';
import { ApiAppEndpointPrefix, HeaderSetCookie, CookieAuthSessionToken, CookieAuthCallbackUrl, CookieAuthCsrfToken } from '../../shared/constants';
import AppConfig from './../../appconfig';

/** 
KB: filters out auth-cookies from "set-cookie":"next.auth...." response headers for some non-auth endpoints 
to prevent restoring auth session on signing out while some of fetch requests still pending 
*/
export default defineNitroPlugin((nitroApp) => {
  if(!AppConfig.authCookiesResponseFilter) {
    return;
  }

  nitroApp.hooks.hook('beforeResponse', (event) => {
    if(!event.node.req.url?.includes(ApiAppEndpointPrefix)) {
      return;
    }

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
    const filteredOutAuthCookies = allCookies.filter(c => ![CookieAuthSessionToken, CookieAuthCallbackUrl, CookieAuthCsrfToken].some(ac => c.includes(ac)));
    if (filteredOutAuthCookies.length !== allCookies.length) {
      try {
        logger?.debug(`(nitro:auth-cookies-response-filter) patching response cookies, path=${event.path}, count=${filteredOutAuthCookies.length}/${allCookies.length}]`);
        setHeader(event, HeaderSetCookie, filteredOutAuthCookies);
      } catch (err: any) {
        logger?.warn(`(nitro:auth-cookies-response-filter) failed to patch response cookies, path=${event.path}, count=${filteredOutAuthCookies.length}/${allCookies.length}]`, err);
      }
    }
  });
});
