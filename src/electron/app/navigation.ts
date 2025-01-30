import { getPagePath, AppPage, type SystemPage, localizePath, type Locale, lookupPageByUrl, getLocaleFromUrl, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, AppConfig, DefaultLocale } from '@golobe-demo/shared';
import { showExceptionDialog } from './dialogs';
import type { ElectronMainLogger } from './logging';
import type { BrowserWindow } from 'electron';
import type { IRendererClientBridge } from '../interfaces';
import { withQuery, parseURL, parseQuery, joinURL } from 'ufo';
import set from 'lodash-es/set';

declare type HtmlPage = AppPage | SystemPage;
declare type NavInfo = { page: HtmlPage, locale: Locale, preview: boolean };

export function getWindowNavInfo(win: BrowserWindow, bridge: IRendererClientBridge, logger: ElectronMainLogger): NavInfo | undefined {
  let currentUrl: string = '';
  try {
    logger.debug(`(Navigation) get window nav info, win=[${win.title}]`);
    currentUrl = win.webContents.getURL();

    const page = lookupPageByUrl(currentUrl);
    if(!page) {
      logger.warn(`(Navigation) failed to get window nav info - unknown page, win=[${win.title}], currentUrl=[${currentUrl}]`);
      showExceptionDialog('warning', bridge, logger);
      return undefined;
    }

    const locale = getLocaleFromUrl(currentUrl) ?? DefaultLocale;
    const url = parseURL(page);
    const preview = (url.search?.length ?? 0) > 0 ? (parseQuery(url.search)[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue)  : false;
    const result = {
      page,
      locale,
      preview
    };

    logger.debug(`(Navigation) window nav info obtained, win=[${win.title}], result=${JSON.stringify(result)}`);
    return result;
  } catch(err: any) {
    logger.warn(`(Navigation) exception while obtaining window nav info, win=[${win.title}], currentUrl=[${currentUrl}]`, err);
    showExceptionDialog('warning', bridge, logger);
    return undefined;
  }
}

export function buildNavUrl(nav: NavInfo, bridge: IRendererClientBridge, logger: ElectronMainLogger): string {
  try {
    const pathname = withQuery(
      localizePath(nav.page === AppPage.Index ? '/' : getPagePath(nav.page), nav.locale), 
      nav.preview ? (set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : {}
    );
    return joinURL(AppConfig.siteUrl, pathname);
  } catch(err: any) {
    logger.warn(`(Navigation) failed to construct nav url, nav=[${JSON.stringify(nav)}]`, err);
    showExceptionDialog('warning', bridge, logger);
    return '/';
  }
}

export function navigateTo(page: AppPage, win: BrowserWindow, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.info(`(Navigation) navigating to page=${page.valueOf()}, win=[${win.title}]`);
    bridge.navigateToPage(page);
    logger.debug(`(Navigation) navigation request called, page=${page.valueOf()}, win=[${win.title}]`);
  } catch(err: any) {
    logger.warn(`(Navigation) navigation failed, page=${page.valueOf()}, win=[${win.title}]`, err);
    showExceptionDialog('warning', bridge, logger);
  }
}