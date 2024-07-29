import { type Theme, QueryPagePreviewModeParam, PreviewModeParamEnabledValue } from '../shared/constants';
import { parseURL, stringifyParsedURL, stringifyQuery } from 'ufo';
import set from 'lodash-es/set';


export function getCurrentThemeSettings () {
  return (document.documentElement.dataset.theme as Theme);
};

export function setCurrentThemeSettings (value: Theme) {
  document.documentElement.dataset.theme = value;
};

export function formatAuthCallbackUrl (url: string, preivewMode: boolean): string {
  if(!url || url === '/') {
    return '/';
  }

  const parsedUrl = parseURL(url);
  parsedUrl.host = parsedUrl.protocol = undefined;
  if(preivewMode) {
    parsedUrl.search = stringifyQuery(set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue));
  }
  const urlWithoutHost = stringifyParsedURL(parsedUrl);
  return urlWithoutHost.startsWith('/') ? urlWithoutHost : `/${urlWithoutHost}`;
}
