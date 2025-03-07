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
    logger.debug('get window nav info', { win: win.title });
    currentUrl = win.webContents.getURL();

    const page = lookupPageByUrl(currentUrl);
    if(!page) {
      logger.warn('failed to get window nav info - unknown page', undefined, { win: win.title, currentUrl });
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

    logger.debug('window nav info obtained', { win: win.title, result });
    return result;
  } catch(err: any) {
    logger.warn('exception while obtaining window nav info', err, { win: win.title, currentUrl });
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
    logger.warn('failed to construct nav url', err, nav);
    showExceptionDialog('warning', bridge, logger);
    return '/';
  }
}

export function navigateTo(page: AppPage, win: BrowserWindow, bridge: IRendererClientBridge, logger: ElectronMainLogger) {
  try {
    logger.info('navigating to', { page: page.valueOf(), win: win.title });
    bridge.navigateToPage(page);
    logger.debug('navigation request called', { page: page.valueOf(), win: win.title });
  } catch(err: any) {
    logger.warn('navigation failed', err, { page: page.valueOf(), win: win.title });
    showExceptionDialog('warning', bridge, logger);
  }
}