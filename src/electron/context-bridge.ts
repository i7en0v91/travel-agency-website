import { type Locale, type Theme, AppConfig, type AppPage } from '@golobe-demo/shared';
import type { NavProps, RendererClientHooks, IRendererClientBridge, HookFnParameters, IpcByteArray } from './interfaces';
import { Hookable } from 'hookable';
import type { ElectronMainLogger } from './app/logging';
import { showConfirmBox, showNotification, showExceptionDialog } from './app/dialogs';
import { getAppLocale } from './app/utils';
import { updateNativeTheme } from './app/theme';
import { Menu, type BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import isArrayLike from 'lodash-es/isArrayLike';
import bind from 'lodash-es/bind';
import { buildMenu } from './app/menu';
import { renderPageToImage } from './app/offscreen-render';

export class RendererClientBridge implements IRendererClientBridge {
  private readonly logger: ElectronMainLogger;
  private readonly app: Electron.App;
  private readonly mainWindow: BrowserWindow;
  public hooks: Hookable<RendererClientHooks>;

  private readonly SiteHost: string;

  constructor (app: Electron.App, mainWindow: BrowserWindow, logger: ElectronMainLogger) {
    this.logger = logger;
    this.app = app;
    this.mainWindow = mainWindow;

    try {
      this.SiteHost = (new URL(AppConfig.siteUrl)).host;

      this.hooks = new Hookable();
      this.registerHooks();
  
      this.logger.debug('(RendererClientBridge) ctor, exit');
    } catch(err: any) {
      this.logger.error('(RendererClientBridge) ctor failed', err);
      throw new Error('failed to setup context bridge');
    }
  }

  /**
  * From main to renderer
  **/ 
  navigateToPage(page: AppPage): void {
    try {
      this.logger.verbose(`(RendererClientBridge) sending navigate to page request, page=${page}`);
      this.mainWindow.webContents.send('request:navigate-to-page', page);
      this.logger.debug(`(RendererClientBridge) navigate to page request sent, page=${page}`);
    } catch(err: any) {
      this.logger.warn(`(RendererClientBridge) navigate to page request failed, page=${page}`, err);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  showExceptionDialog(type: 'warning' | 'error'): void {
    try {
      this.logger.verbose(`(RendererClientBridge) sending show exception dialog request, type=${type}`);
      this.mainWindow.webContents.send('request:show-exception', type);
      this.logger.debug(`(RendererClientBridge) show exception dialog request sent, type=${type}`);
    } catch(err: any) {
      this.logger.warn(`(RendererClientBridge) show exception dialog request failed, type=${type}`, err);
    }
  }

  openSiteSearch(): void {
    try {
      this.logger.verbose('(RendererClientBridge) sending open site search');
      this.mainWindow.webContents.send('request:site-search');
      this.logger.debug('(RendererClientBridge) show open site search request sent');
    } catch(err: any) {
      this.logger.warn('(RendererClientBridge) show open site search request failed', err);
    }
  }

  setTheme(theme: Theme): void {
    try {
      this.logger.verbose(`(RendererClientBridge) sending set theme request, theme=${theme}`);
      this.mainWindow.webContents.send('request:set-theme', theme);
      this.logger.debug(`(RendererClientBridge) set theme request sent, theme=${theme}`);
    } catch(err: any) {
      this.logger.warn(`(RendererClientBridge) set theme request failed, theme=${theme}`, err);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  setLocale(locale: Locale): void {
    try {
      this.logger.verbose(`(RendererClientBridge) sending set locale request, locale=${locale}`);
      this.mainWindow.webContents.send('request:set-locale', locale);
      this.logger.debug(`(RendererClientBridge) set locale request sent, locale=${locale}`);
    } catch(err: any) {
      this.logger.warn(`(RendererClientBridge) set locale request failed, locale=${locale}`, err);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  logout(): void {
    try {
      this.logger.verbose('(RendererClientBridge) sending logout request');
      this.mainWindow.webContents.send('request:logout');
      this.logger.debug('(RendererClientBridge) logout request sent');
    } catch(err: any) {
      this.logger.warn('(RendererClientBridge) logout request failed', err);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  /**
  * From renderer to main
  **/ 
  onPageNavigated(page: AppPage): void {
    this.logger.debug(`(RendererClientBridge) page navigated handler, page=${page}`);
  }

  onThemeChanged(theme: Theme): void {
    this.logger.verbose(`(RendererClientBridge) on theme changed handler, theme=${theme}`);
    updateNativeTheme(theme, this, this.logger);
    this.logger.debug(`(RendererClientBridge) theme changed handler completed, theme=${theme}`);
  }

  onNavBarRefreshed(nav: NavProps): void {
    this.logger.verbose('(RendererClientBridge) on nav refreshed');
    const appMenu = buildMenu(nav, this.mainWindow, this, this.app, this.logger);
    this.logger.verbose('(RendererClientBridge) applying new menu');
    Menu.setApplicationMenu(appMenu);
    this.logger.debug('(RendererClientBridge) nav refreshed handler completed');
  }

  showMessageBox(type: 'info' | 'warning' | 'error', msg: string, title: string | undefined): void {
    this.logger.verbose(`(RendererClientBridge) show message box, type=${type}, msg=${msg}, title=${title}`);
    showNotification(type, msg, title, this.logger, this.mainWindow);
    this.logger.debug(`(RendererClientBridge) message box shown, type=${type}, msg=${msg}, title=${title}`);
  }

  async showConfirmBox<TButton>(msg: string, title: string, buttons: TButton[]): Promise<TButton | undefined> {
    this.logger.verbose(`(RendererClientBridge) show confirm box, msg=${msg}, title=${title}, buttons=[${buttons.join(', ')}]`);
    const result = await showConfirmBox(msg, title, buttons, this.logger, this.mainWindow);
    this.logger.debug(`(RendererClientBridge) show confirm box, msg=${msg}, title=${title}, result=${result}`);
    return result;
  }

  showFatalErrorBox(msg: string): void {
    this.logger.verbose('(RendererClientBridge) show fatal error box', msg);
    showNotification('fatal', msg, undefined, this.logger, this.mainWindow);
    this.logger.debug('(RendererClientBridge) fatal error box shown', msg);
  }

  getCurrentUrl(): string {
    this.logger.debug('(RendererClientBridge) get current url');
    const currentUrl = this.mainWindow.webContents.getURL();
    this.logger.debug(`(RendererClientBridge) current url returned, result=[${currentUrl}]`);
    return currentUrl;
  }

  getAppLocale(): string {
    this.logger.debug('(RendererClientBridge) get app locale');
    const appLocale = getAppLocale(this.app, this.logger);
    this.logger.debug(`(RendererClientBridge) current app locale=${appLocale}`);
    return appLocale;
  }

  async renderPageToImage(path: string): Promise<IpcByteArray> {
    this.logger.debug(`(RendererClientBridge) render page, path=${path}`);
    const result = await renderPageToImage(path, this.logger);
    this.logger.debug(`(RendererClientBridge) render page completed, path=${path}, result length=${result.length}`);
    return result;
  }

  ///////////////

  registerHook<THook extends keyof RendererClientHooks = keyof RendererClientHooks>(name: THook, fn: RendererClientHooks[THook]): void {
    this.hooks.hook(name, bind(fn, this) as any);
  }

  async callHook<THook extends keyof RendererClientHooks = keyof RendererClientHooks>(name: THook, event: IpcMainEvent | IpcMainInvokeEvent, ...params: HookFnParameters<RendererClientHooks[THook]>): Promise<ReturnType<RendererClientHooks[THook]> | undefined> {
    const senderFrameUrl = event.senderFrame?.url;
    if(!senderFrameUrl?.length) {
      this.logger.warn(`(RendererClientBridge) hook invocation exception - sender frame url validation failed, name=${name}, params=[${JSON.stringify(params)}], senderFrameUrl=[${event.senderFrame?.url}]`);
      throw new Error('invalid sender frame');
    }
    if ((new URL(senderFrameUrl)).host !== this.SiteHost) {
      this.logger.warn(`(RendererClientBridge) hook invocation exception - invalid sender frame url, name=${name}, params=[${JSON.stringify(params)}], senderFrameUrl=[${event.senderFrame?.url}]`);
      throw new Error('invalid sender frame');
    }

    try {
      this.logger.verbose(`(RendererClientBridge) hook callback, name=${name}, params=[${JSON.stringify(params)}]`);
      const result = await this.hooks.callHook(name, ...params) as any;
      this.logger.debug(`(RendererClientBridge) hook callback completed, name=${name}, params=[${JSON.stringify(params)}], result=${isArrayLike(result) ? result.length : JSON.stringify(result)}`);
      return result;
    } catch(err: any) {
      this.logger.warn(`(RendererClientBridge) hook callback failed, name=${name}`, err);
      showExceptionDialog('warning', this, this.logger);
      return undefined;
    }
  }

  registerHooks() {
    this.logger.debug('(RendererClientBridge) registering hooks');

    this.registerHook('on:page-navigated', this.onPageNavigated);
    ipcMain.on('on:page-navigated', (event: IpcMainEvent, page) => this.callHook('on:page-navigated', event, page as AppPage));

    this.registerHook('on:dialogs:msg-box', this.showMessageBox);
    ipcMain.on('on:dialogs:msg-box', (event: IpcMainEvent, type, msg, title) => this.callHook('on:dialogs:msg-box', event, type, msg, title));

    this.registerHook('invoke:current-url', this.getCurrentUrl);
    ipcMain.handle('invoke:current-url', (event: IpcMainInvokeEvent) => this.callHook('invoke:current-url', event));

    this.registerHook('invoke:app-locale', this.getAppLocale);
    ipcMain.handle('invoke:app-locale', (event: IpcMainInvokeEvent) => this.callHook('invoke:app-locale', event));

    this.registerHook('invoke:dialogs:confirm-box', this.showConfirmBox);
    ipcMain.handle('invoke:dialogs:confirm-box', <TButton>(event: IpcMainInvokeEvent, msg: string, title: string, buttons: TButton[]) => this.callHook('invoke:dialogs:confirm-box', event, msg, title, buttons));

    this.registerHook('invoke:render-page', this.renderPageToImage);
    ipcMain.handle('invoke:render-page', (event: IpcMainInvokeEvent, path: string) => this.callHook('invoke:render-page', event, path));

    this.registerHook('on:dialogs:fatal', this.showFatalErrorBox);
    ipcMain.handle('on:dialogs:fatal', (event: IpcMainInvokeEvent, msg) => this.callHook('on:dialogs:fatal', event, msg));

    this.registerHook('on:theme-changed', this.onThemeChanged);
    ipcMain.on('on:theme-changed', (event: IpcMainEvent, theme) => this.callHook('on:theme-changed', event, theme as Theme));

    this.registerHook('on:nav-refreshed', this.onNavBarRefreshed);
    ipcMain.on('on:nav-refreshed', (event: IpcMainEvent, nav) => this.callHook('on:nav-refreshed', event, nav as NavProps));

    this.logger.debug('(RendererClientBridge) hooks were registered');
  }
}