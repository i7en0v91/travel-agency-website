import { type Locale, type Theme, AppConfig, type AppPage } from '@golobe-demo/shared';
import type { NavProps, RendererClientHooks, IRendererClientBridge, HookFnParameters, IpcByteArray } from './interfaces';
import { Hookable } from 'hookable';
import type { ElectronMainLogger } from './app/logging';
import { showConfirmBox, showNotification, showExceptionDialog } from './app/dialogs';
import { getAppLocale } from './app/utils';
import { updateNativeTheme } from './app/theme';
import { Menu, type BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
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
  
      this.logger.debug('ctor, exit');
    } catch(err: any) {
      this.logger.error('ctor failed', err);
      throw new Error('failed to setup context bridge');
    }
  }

  /**
  * From main to renderer
  **/ 
  navigateToPage(page: AppPage): void {
    try {
      this.logger.verbose('sending navigate to page request', page);
      this.mainWindow.webContents.send('request:navigate-to-page', page);
      this.logger.debug('navigate to page request sent', page);
    } catch(err: any) {
      this.logger.warn('navigate to page request failed', err, page);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  showExceptionDialog(type: 'warning' | 'error'): void {
    try {
      this.logger.verbose('sending show exception dialog request', type);
      this.mainWindow.webContents.send('request:show-exception', type);
      this.logger.debug('show exception dialog request sent', type);
    } catch(err: any) {
      this.logger.warn('show exception dialog request failed', err, type);
    }
  }

  openSiteSearch(): void {
    try {
      this.logger.verbose('sending open site search');
      this.mainWindow.webContents.send('request:site-search');
      this.logger.debug('show open site search request sent');
    } catch(err: any) {
      this.logger.warn('show open site search request failed', err);
    }
  }

  setTheme(theme: Theme): void {
    try {
      this.logger.verbose('sending set theme request', theme);
      this.mainWindow.webContents.send('request:set-theme', theme);
      this.logger.debug('set theme request sent', theme);
    } catch(err: any) {
      this.logger.warn('set theme request failed', err, theme);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  setLocale(locale: Locale): void {
    try {
      this.logger.verbose('sending set locale request', locale);
      this.mainWindow.webContents.send('request:set-locale', locale);
      this.logger.debug('set locale request sent', locale);
    } catch(err: any) {
      this.logger.warn('set locale request failed', err, locale);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  logout(): void {
    try {
      this.logger.verbose('sending logout request');
      this.mainWindow.webContents.send('request:logout');
      this.logger.debug('logout request sent');
    } catch(err: any) {
      this.logger.warn('logout request failed', err);
      showExceptionDialog('warning', this, this.logger);
    }
  }

  /**
  * From renderer to main
  **/ 
  onPageNavigated(page: AppPage): void {
    this.logger.debug('page navigated handler', page);
  }

  onThemeChanged(theme: Theme): void {
    this.logger.verbose('on theme changed handler', theme);
    updateNativeTheme(theme, this, this.logger);
    this.logger.debug('theme changed handler completed', theme);
  }

  onNavBarRefreshed(nav: NavProps): void {
    this.logger.verbose('on nav refreshed');
    const appMenu = buildMenu(nav, this.mainWindow, this, this.app, this.logger);
    this.logger.verbose('applying new menu');
    Menu.setApplicationMenu(appMenu);
    this.logger.debug('nav refreshed handler completed');
  }

  showMessageBox(type: 'info' | 'warning' | 'error', msg: string, title: string | undefined): void {
    this.logger.verbose('show message box', { type, msg, title });
    showNotification(type, msg, title, this.logger, this.mainWindow);
    this.logger.debug('message box shown', { type, msg, title });
  }

  async showConfirmBox<TButton>(msg: string, title: string, buttons: TButton[]): Promise<TButton | undefined> {
    this.logger.verbose('show confirm box', { msg, title, buttons });
    const result = await showConfirmBox(msg, title, buttons, this.logger, this.mainWindow);
    this.logger.debug('show confirm box', { msg, title, result });
    return result;
  }

  showFatalErrorBox(msg: string): void {
    this.logger.verbose('show fatal error box');
    showNotification('fatal', msg, undefined, this.logger, this.mainWindow);
    this.logger.debug('fatal error box shown');
  }

  getCurrentUrl(): string {
    this.logger.debug('get current url');
    const currentUrl = this.mainWindow.webContents.getURL();
    this.logger.debug('current url returned', { result: currentUrl });
    return currentUrl;
  }

  getAppLocale(): string {
    this.logger.debug('get app locale');
    const appLocale = getAppLocale(this.app, this.logger);
    this.logger.debug('current app', { locale: appLocale });
    return appLocale;
  }

  async renderPageToImage(path: string): Promise<IpcByteArray> {
    this.logger.debug('render page', path);
    const result = await renderPageToImage(path, this.logger);
    this.logger.debug('render page completed', { path, length: result.length });
    return result;
  }

  ///////////////

  registerHook<THook extends keyof RendererClientHooks = keyof RendererClientHooks>(name: THook, fn: RendererClientHooks[THook]): void {
    this.hooks.hook(name, bind(fn, this) as any);
  }

  async callHook<THook extends keyof RendererClientHooks = keyof RendererClientHooks>(name: THook, event: IpcMainEvent | IpcMainInvokeEvent, ...params: HookFnParameters<RendererClientHooks[THook]>): Promise<ReturnType<RendererClientHooks[THook]> | undefined> {
    const senderFrameUrl = event.senderFrame?.url;
    if(!senderFrameUrl?.length) {
      this.logger.warn('hook invocation exception - sender frame url validation failed', undefined, { name, params, senderFrameUrl: event.senderFrame?.url });
      throw new Error('invalid sender frame');
    }
    if ((new URL(senderFrameUrl)).host !== this.SiteHost) {
      this.logger.warn('hook invocation exception - invalid sender frame url', undefined, { name, params, senderFrameUrl: event.senderFrame?.url });
      throw new Error('invalid sender frame');
    }

    try {
      this.logger.verbose('hook callback', { name, params });
      const result = await this.hooks.callHook(name, ...params) as any;
      this.logger.debug('hook callback completed', { name, params, result });
      return result;
    } catch(err: any) {
      this.logger.warn('hook callback failed', err, name);
      showExceptionDialog('warning', this, this.logger);
      return undefined;
    }
  }

  registerHooks() {
    this.logger.debug('registering hooks');

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

    this.logger.debug('hooks were registered');
  }
}