
import { AppPage, getPagePath } from '../shared/page-query-params';
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue } from './../shared/constants';
import set from 'lodash-es/set';
import { parseQuery, parseURL, stringifyParsedURL, withQuery } from 'ufo';
import { localizePath } from './../shared/i18n';
import { type Locale } from './../shared/constants';
import assign from 'lodash-es/assign';
import { usePreviewState } from './../composables/preview-state';

export interface INavLinkBuilder {
  buildPageLink(htmlPage: AppPage, locale: Locale, query?: any): string;
  buildLink(navLink: string, locale: Locale, query?: any): string;
}

export function useNavLinkBuilder (): INavLinkBuilder {
  const { enabled } = usePreviewState();

  const buildPageLink = (htmlPage: AppPage, locale: Locale, query?: any): string => {
    return withQuery(localizePath(htmlPage === AppPage.Index ? '/' : getPagePath(htmlPage), locale), enabled ? (set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : (query ?? {}));
  };

  const buildLink = (navLink: string, locale: Locale, query?: any): string => {
    const parsedLink = parseURL(navLink);
    parsedLink.host = parsedLink.protocol = undefined;
    if(query) {
      const navQuery = parsedLink.search?.length ? parseQuery(parsedLink.search) : {};
      query = assign(navQuery, query);
      parsedLink.search = '';
    }

    let pathname = stringifyParsedURL(parsedLink);
    if(pathname.startsWith('/') && pathname !== '/') {
      pathname = pathname.substring(1, pathname.length);
    }   
    return withQuery(localizePath(pathname, locale), enabled ? (set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : (query ?? {}));
  };

  return {
    buildPageLink,
    buildLink
  };
}
