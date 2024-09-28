import { normalizeURL, parseURL } from 'ufo';
import { EntityIdPages, HtmlPagePaths, AllHtmlPages, SystemPage, AppPage, AvailableLocaleCodes } from './constants';
import type { EntityId } from './types';

export function getPagePath(page: AppPage | SystemPage): string {
  if(page === SystemPage.Drafts) {
    return 'drafts';
  }
  return HtmlPagePaths.get(page)!;
};

export function lookupPageByUrl(urlOrPathname: string): AppPage | SystemPage | undefined {
  if (!urlOrPathname?.trim()) {
    return AppPage.Index;
  }

  const urlObj = parseURL(normalizeURL(urlOrPathname));
  if (!urlObj.pathname) {
    return AppPage.Index;
  }
  
  if (urlObj.pathname.includes('/index')) {
    return AppPage.Index;
  }

  if(urlObj.pathname.includes(`/${SystemPage.Drafts.valueOf().toLowerCase()}`)) {
    return SystemPage.Drafts;
  }

  const slashedPathName = urlObj.pathname.startsWith('/') ? urlObj.pathname : `/${urlObj.pathname}`;
  if(AvailableLocaleCodes.some(c => ['/', `/${c}`, `/${c}/`].includes(slashedPathName.toLowerCase()))) {
    return AppPage.Index;
  }

  return AllHtmlPages.find(pp => pp !== AppPage.Index && slashedPathName.includes(`/${getPagePath(pp)}`));
};

export function extractIdFromUrl(urlOrPathname: string): EntityId | undefined {
  const page = lookupPageByUrl(urlOrPathname);
  if(!page) {
    return undefined;
  }
  if(page === SystemPage.Drafts) {
    return undefined;
  }

  if(!EntityIdPages.includes(page)) {
    return undefined;
  }

  const urlParts = urlOrPathname.split('/');
  const pagePathIdx = urlParts.indexOf(getPagePath(page));
  if(pagePathIdx < 0 || (pagePathIdx >= urlParts.length - 1)) {
    return undefined;
  }

  return urlParts.splice(0, pagePathIdx + 2).pop();
}
