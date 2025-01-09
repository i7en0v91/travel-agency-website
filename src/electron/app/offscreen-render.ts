import { AppConfig, spinWait } from '@golobe-demo/shared';
import { BrowserWindow } from 'electron';
import type { ElectronMainLogger } from './logging';
import { DeviceSizeBreakpointsMap, DeviceSizeEnum } from '../../helpers/constants';
import { joinURL } from 'ufo';
import { resolve } from 'pathe';

const WinWidth = DeviceSizeBreakpointsMap.get(DeviceSizeEnum.XL)!;
const RenderingTimeoutSec = 20;
const BookingDetailsDivSelector = '.booking-details-page';

async function testElement(webContents: Electron.WebContents, selector: string, logger: ElectronMainLogger): Promise<boolean> {
  try {
    logger.debug(`(OffscreenRender) testing selector=[${selector}]`);
    const result = !!(await webContents.executeJavaScript(`!!(document.querySelector('${selector}'))`));
    logger.debug(`(OffscreenRender) test selector=[${selector}], result=${result}`);
    return result;
  } catch(err: any) {
    logger.warn(`(OffscreenRender) exception while testing selector=[${selector}]`, err);
    throw new Error('exception querying page content');
  }
}

async function getBookingPageReadiness(webContents: Electron.WebContents, logger: ElectronMainLogger): Promise<false | { height: number }> {
  const isReady = await testElement(webContents, BookingDetailsDivSelector, logger);
  if(!isReady) {
    return false;
  }
  
  try {
    const height = (await webContents.executeJavaScript(`document.querySelector('${BookingDetailsDivSelector}').getBoundingClientRect().height`)) as number;
    logger.debug(`(OffscreenRender) booking page is ready, content height=${height}`);
    return { height };
  } catch(err: any) {
    logger.warn(`(OffscreenRender) exception while obtaining booking page content height`, err);
    throw new Error('exception querying booking page content');
  }
}

export async function renderPageToImage(path: string, logger: ElectronMainLogger): Promise<Uint8Array> {
  logger.verbose(`(OffscreenRender) rendering page, path=${path}`);
  
  let win: BrowserWindow | undefined;
  try {
    win = new BrowserWindow({
      width: WinWidth,
      height: 600,
      show: false,
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
        sandbox: true,
        preload: resolve('electron/preload.js')
      }
    });
    const url = joinURL(AppConfig.siteUrl, path);
    const pageLoad = win.loadURL(url);
  
    logger.debug(`(OffscreenRender) waiting page is ready, path=${path}`);
    let loaded = false;
    win.once('ready-to-show', () => { 
      logger.debug(`(OffscreenRender) page is loaded, url=${url}`);
      loaded = true;
    });
    await pageLoad;
  
    const pageReadyChecker = async () => { return !!(loaded && await getBookingPageReadiness(win!.webContents, logger)); }; // currently only booking page is needed
    const isReady = await spinWait(pageReadyChecker, RenderingTimeoutSec * 1000);
    if(!isReady) {
      logger.warn(`(OffscreenRender) exception while rendering - timeout waiting page is ready, url=${url}`);
      throw new Error('timeout waiting for page is ready');
    }
    const readyStatus = (await getBookingPageReadiness(win.webContents, logger));
    if(!readyStatus) { throw new Error('timeout waiting for page is ready'); }
  
    const contentHeight = readyStatus.height;
    logger.debug(`(OffscreenRender) fitting page size to content, path=${path}, height=${contentHeight}`);
    const contentBounds = { x: 0, y: 0, width: WinWidth, height: contentHeight };
    win.setContentBounds(contentBounds);
  
    logger.debug(`(OffscreenRender) capturing, path=${path}`);
    let buffer: Buffer | undefined;
    setTimeout(() => {
      win!.webContents.setFrameRate(60);
      win!.webContents.on('paint', (event, dirty, image) => {
        try {
          buffer = image.toJPEG(80);
        } catch(err: any) {
          logger.warn(`(OffscreenRender) exception while capturing page content, path=${path}, height=${contentHeight}`, err);
          throw new Error('exception while capturing page content');
        }
      });
    }, 1);
  
    if(!await spinWait(() => { return Promise.resolve((buffer?.length ?? 0) > 0); }, RenderingTimeoutSec * 1000)) {
      logger.warn(`(OffscreenRender) exception while rendering - timeout capturing page content, path=${path}, height=${contentHeight}`);
      throw new Error('timeout capturing page content');
    }
    const result = new Uint8Array(buffer!);
  
    logger.verbose(`(OffscreenRender) rendering page completed, path=${path}, result length=${result.length}`);
    return result;
  } finally {
    try {
      win?.destroy();
    } catch(err: any) {
      logger.warn(`(OffscreenRender) exception while destroying offscreen window, path=${path}`, err);
    }
  }
}