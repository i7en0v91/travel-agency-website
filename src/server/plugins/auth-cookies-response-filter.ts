import { HeaderSetCookie, CookieAuthSessionToken, CookieAuthCallbackUrl, CookieAuthCsrfToken, AppConfig, type IAppLogger } from '@golobe-demo/shared';
import { ApiAppEndpointPrefix,  } from './../api-definitions';
import { splitCookiesString } from 'h3';
import flatten from 'lodash-es/flatten';
import { getCommonServices } from '../../helpers/service-accessors';

/** 
KB: filters out auth-cookies from "set-cookie":"next.auth...." response headers for some non-auth endpoints 
to prevent restoring auth session on signing out while some of fetch requests still pending 
*/
export default defineNitroPlugin((nitroApp) => {
  if(!AppConfig.authCookiesResponseFilter) {
    return;
  }

  nitroApp.hooks.hook('beforeResponse', (event) => {
    const logger: IAppLogger | undefined = getCommonServices()?.getLogger()?.addContextProps({ component: 'NitroCookiesResponseFilter' });
    if(!event.node.req.url?.includes(ApiAppEndpointPrefix)) {
      return;
    }

    if (!event.headers) {
      return;
    }
    
    const allHeaders = event.node.res.getHeaders();
    const setCookieValues = allHeaders[HeaderSetCookie];
    if (!setCookieValues || setCookieValues.length === 0) {
      return;
    }

    const allCookies = flatten([...setCookieValues].map(h => splitCookiesString(h)));
    const filteredOutAuthCookies = allCookies.filter(c => ![CookieAuthSessionToken, CookieAuthCallbackUrl, CookieAuthCsrfToken].some(ac => c.includes(ac)));
    if (filteredOutAuthCookies.length !== allCookies.length) {
      try {
        logger?.debug('patching response cookies', { path: event.path, count: filteredOutAuthCookies.length });
        setResponseHeader(event, HeaderSetCookie, filteredOutAuthCookies);
      } catch (err: any) {
        logger?.warn('failed to patch response cookies', err, { path: event.path, count: filteredOutAuthCookies.length });
      }
    }
  });
});
