import type { Locale, Theme, AppPage } from '@golobe-demo/shared';
import type { IpcRendererEvent } from 'electron';
import type { Hookable } from 'hookable';

export declare type NavGroupItemRole = 'file' | 'account' | 'view' | 'view:theme' | 'view:locale' | 'help';
export declare type NavSubItemRole = 
  'flights' | 'stays' | 'index' | // File
  'login' | 'signup' | 'profile' | 'favourites' | 'logout' | // Account
  'go-back' | 'go-next' |  // View
  'view:theme' | 'theme:dark' | 'theme:light' | // View - Theme
  'view:locale' | `locale:${Locale}` | // View - Language
  'contact-us' ; // Help
export type NavProps = Array<{
  role: NavGroupItemRole,
  label: string,
  subItems: Array<{ role: NavSubItemRole, label: string }>
}>;
export type IpcByteArray = Uint8Array;

export type HookFnParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/***
 * For main Electron app provides integration with UI client (renderer) via {@type IpcMain}
 */
export interface IRendererClientBridge {
  navigateToPage: (page: AppPage) => void,
  showExceptionDialog(type: 'warning' | 'error'): void,
  setTheme(theme: Theme): void,
  setLocale(locale: Locale): void,
  logout(): void,
  hooks: Hookable<RendererClientHooks>
}

/***
 * Allows Electron app to respond on events occuring inside UI client (renderer)
 */
export interface RendererClientHooks {
  /***
   * Fired when user gets navigated to new page {@link page}
   */
  'on:page-navigated': (page: AppPage) => void,
  /***
   * Show message box
   */
  'on:dialogs:msg-box': (type: 'info' | 'warning' | 'error', msg: string, title: string | undefined) => void
  /***
   * Show confirm box
   */
  'invoke:dialogs:confirm-box': <TButton>(msg: string, title: string, buttons: TButton[]) => Promise<TButton | undefined>
  /***
   * Invoked when renderer requests current page URL
   */
  'invoke:current-url': () => string,
  /***
   * Invoked when renderer requests application locale
   */
  'invoke:app-locale': () => string,
  /***
   * Show fatal error box
   */
  'on:dialogs:fatal': (msg: string) => void,
  /***
   * Fired when user changes theme from web page
   */
  'on:theme-changed': (theme: Theme) => void,
  /***
   * Fired when navbar is refreshed
   */
  'on:nav-refreshed': (nav: NavProps) => void,
  /***
   * Invoked when renderer requests to capture page content as image
   */
  'invoke:render-page': (path: string) => Promise<IpcByteArray>
}

/***
 * Typings for preload scripts exports into main world for renderer to main flow
 */
export interface IMainWorldRendererExports {
  // navigation
  getCurrentUrl: () => Promise<string>,
  notifyPageNavigated: (page: AppPage) => void,

  // dialogs
  showMessageBox: (type: 'info' | 'warning' | 'error', msg: string, title: string | undefined) => void,
  showConfirmBox: <TButton>(msg: string, title: string, buttons: TButton[]) => Promise<TButton | undefined>,
  showFatalErrorBox: (msg: string) => void,

  // theme
  notifyThemeChanged: (theme: Theme) => void

  // app menu
  notifyNavBarRefreshed: (nav: NavProps) => void,

  // system preferences
  getAppLocale: () => Promise<string>

  // system services
  renderPageToImage: (path: string) => Promise<IpcByteArray>
}
/***
 * Typings for preload scripts exports into main world for main to renderer flow
 */
export interface IMainWorldAppExports {
  onRequestNavigateToPage: (callback: (event: IpcRendererEvent, page: AppPage) => void) => void
  onRequestShowExceptionDialog: (callback: (event: IpcRendererEvent, type: 'warning' | 'error') => void) => void
  onRequestSetTheme: (callback: (event: IpcRendererEvent, theme: Theme) => void) => void
  onRequestSetLocale: (callback: (event: IpcRendererEvent, locale: Locale) => void) => void
  onRequestLogout: (callback: (event: IpcRendererEvent) => void) => void
}
export interface IMainWorldExports extends IMainWorldRendererExports, IMainWorldAppExports {};

/***
 * For UI client (renderer) provides integration interface with Electron app via {@type IpcRenderer}
 */
export interface IElectronShell extends IMainWorldRendererExports {
  hooks: Hookable<ElectronShellHooks>
}

/***
 * Allows UI client (renderer) to respond on events coming from main Electron app
 */
export interface ElectronShellHooks {
  /**
   * Invoked when user needs to be navigated to new page {@link page}
   */
  'request:navigate-to-page': (page: AppPage) => void;
  /**
   * Invoked when default exception dialog must be shown to user
   */
  'request:show-exception': (type: 'warning' | 'error') => void;
  /**
   * Invoked when theme switch is requested
   */
  'request:set-theme': (theme: Theme) => void;
  /**
   * Invoked when locale switch is requested
   */
  'request:set-locale': (locale: Locale) => void;
  /**
   * Invoked when user logout action requested
   */
  'request:logout': () => void;
}