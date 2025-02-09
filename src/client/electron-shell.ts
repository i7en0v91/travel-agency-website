import { getI18nResName2, AppException, AppExceptionCodeEnum, type Theme, getPagePath, DefaultLocale, lookupPageByUrl, getLocaleFromUrl, localizePath, AppPage, type SystemPage, type IAppLogger, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, type Locale } from '@golobe-demo/shared';
import type { IMainWorldExports, IElectronShell, ElectronShellHooks, HookFnParameters, NavProps, IpcByteArray } from '../electron/interfaces';
import { getDialogsFacade } from './../helpers/electron';
import { nextTick as vueNextTick } from 'vue';
import { withQuery, parseURL, parseQuery } from 'ufo';
import isArrayLike from 'lodash-es/isArray';
import set from 'lodash-es/set';
import bind from 'lodash-es/bind';
import { Hookable } from 'hookable';
import { consola } from 'consola';
import { useSignOut } from '../composables/sign-out';

declare type HtmlPage = AppPage | SystemPage;
declare type NavInfo = { page: HtmlPage, locale: Locale, preview: boolean };

export class ElectronShell implements IElectronShell {
  private readonly logger: IAppLogger;
  private readonly electronApi: IMainWorldExports;
  private readonly localizer: (ReturnType<typeof useI18n>)['t'];
  public hooks: Hookable<ElectronShellHooks>;

  public static inject = ['logger', 'localizer'] as const;
  constructor (logger: IAppLogger, localizer: (ReturnType<typeof useI18n>)['t']) {
    this.logger = logger;
    this.localizer = localizer;

    this.logger.verbose('(ElectronShell) ctor, checking Electron Api');
    this.electronApi = (window as any).electronApi as IMainWorldExports;
    if(!this.electronApi) {
      this.logger.error(`(ElectronShell) Electron Api is not initialized`);  
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'Electron Api is not initialized', 'error-page');
    }

    this.hooks = new Hookable();
    this.registerHooks();

    this.logger.debug('(ElectronShell) ctor, exit');
  }

  async getCurrentUrl(): Promise<string> {
    try {
      this.logger.debug('(ElectronShell) get current url');
      const result = await this.electronApi.getCurrentUrl();
      this.logger.debug(`(ElectronShell) get current url, result=[${result}]`);
      return result;
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while obtaining current url`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'unknown error', 'error-stub');
    }
  }

  async getAppLocale(): Promise<string> {
    try {
      this.logger.debug('(ElectronShell) get app locale');
      const result = await this.electronApi.getAppLocale();
      this.logger.debug(`(ElectronShell) get app locale, result=${result}`);
      return result;
    } catch(err: any) {
      this.logger.warn('(ElectronShell) exception while obtaining app locale', err);
      return DefaultLocale;
    }
  }

  async renderPageToImage(path: string): Promise<IpcByteArray> {
    try {
      this.logger.debug(`(ElectronShell) rendering page to image, path=${path}`);
      const result = await this.electronApi.renderPageToImage(path);
      if(!result?.length) {
        throw new Error('page rendering failed');
      }

      this.logger.debug(`(ElectronShell) rendering page to image, path=${path}, result length=${result.length}`);
      return result;
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while rendering page to image, path=${path}`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to render page', 'error-stub');
    }
  }

  showMessageBox(type: 'info' | 'warning' | 'error', msg: string, title: string | undefined) {
    try {
      this.logger.debug(`(ElectronShell) show message box, type=${type}, msg=${msg}`);
      this.electronApi.showMessageBox(type, msg, title);
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception showing message box, type=${type}, msg=${msg}`, err);
    }
  }

  async showConfirmBox<TButton>(msg: string, title: string, buttons: TButton[]): Promise<TButton | undefined> {
    try {
      this.logger.debug(`(ElectronShell) show confirm box, msg=${msg}, buttons=[${buttons.join(', ')}]`);
      const result = await this.electronApi.showConfirmBox(msg, title, buttons);
      this.logger.debug(`(ElectronShell) show confirm box, msg=${msg}, result=${result}`);
      return result;
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception showing confirm box, msg=${msg}, buttons=[${buttons.join(', ')}]`, err);
      return undefined;
    }
  }

  showFatalErrorBox(msg: string) {
    try {
      this.logger.debug(`(ElectronShell) show fatal error box, msg=${msg}`);
      this.electronApi.showFatalErrorBox(msg);
    } catch(err: any) {
      consola.error(`(exception showing) FATAL error, msg=${msg}`, err);
      try {
        this.logger.error(`(ElectronShell) exception showing fatal error box, msg=${msg}`, err);
      } finally {
        process.exit(1);
      }
    }
  }

  notifyPageNavigated(page: AppPage): void {
    try {
      this.logger.verbose(`(ElectronShell) notify page navigated, page=${page}`);
      this.electronApi.notifyPageNavigated(page);
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while notifying page navigated`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'unknown error', 'error-stub');
    }
  }

  notifyThemeChanged(theme: Theme): void {
    try {
      this.logger.verbose(`(ElectronShell) notify theme changed, theme=${theme}`);
      this.electronApi.notifyThemeChanged(theme);
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while notifying theme changed`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'unknown error', 'error-stub');
    }
  }

  notifyNavBarRefreshed(nav: NavProps): void {
    try {
      this.logger.verbose('(ElectronShell) notify nav bar refreshed');
      this.electronApi.notifyNavBarRefreshed(nav);
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while notifying nav bar refreshed`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'unknown error', 'error-stub');
    }
  }
  
  getCurrentNavInfo(router: ReturnType<typeof useRouter>): NavInfo | undefined {
    this.logger.debug(`(ElectronShell) get current nav info`);
  
    let result: NavInfo;
  
    const currentUrl = router.currentRoute.value.fullPath;
    let page: HtmlPage | undefined;
  
    try {
      page = lookupPageByUrl(currentUrl);
      if(!page) {
        this.logger.warn(`(ElectronShell) failed to get current nav info - unknown page, currentUrl=[${currentUrl}]`);
        return undefined;
      }
  
      const locale = getLocaleFromUrl(currentUrl) ?? DefaultLocale;
      const url = parseURL(page);
      const preview = (url.search?.length ?? 0) > 0 ? (parseQuery(url.search)[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue)  : false;
      result = {
        page,
        locale,
        preview
      };
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while obtaining current nav info, currentUrl=[${currentUrl}]`, err);
      return undefined;
    }
    
    this.logger.debug(`(ElectronShell) current nav info obtained, result=${JSON.stringify(result)}`);
    return result;
  }

  onRequestShowExceptionDialog(type: 'warning' | 'error') {
    try {
      this.logger.verbose(`(ElectronShell) on request to show exception dialog, type=${type}`);
      const dialogsFacade = getDialogsFacade(this.localizer);
      const msg = this.localizer(getI18nResName2('appErrors', 'unknown'));
      dialogsFacade.showNotification(type, msg);
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while executing request to show exception dialog, type=${type}`, err);
    }
  }

  onRequestNavigateToPage(page: AppPage) {  
    try {
      this.logger.verbose(`(ElectronShell) on request to navigate to new page, page=${page.valueOf()}`);

      const router = useRouter();
      const nav = this.getCurrentNavInfo(router);
      if(!nav) {
        this.logger.warn(`(ElectronShell) failed to navigate to page - cannot obtain current nav info, page=${page.valueOf()}`);
        return;
      }
  
      const pathname = withQuery(
        localizePath(page === AppPage.Index ? '/' : getPagePath(page), nav.locale), 
        nav.preview ? (set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : {}
      );
      
      this.logger.verbose(`(ElectronShell) pushing route, route=[${pathname}]`);
      router.push(pathname)
        .then(() => {
          this.logger.verbose(`(ElectronShell) on request to navigate to new page completed, page=${page.valueOf()}`);
        }).catch((err) => {
          this.logger.warn(`(ElectronShell) failed to navigate to page - unknown exception, page=${page.valueOf()}`, err);
        });
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) exception while executing request to navigate to new page handler, page=${page}`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'page navigation failed', 'error-stub');
    }
  }

  onRequestSetLocale(locale: Locale) {
    vueNextTick(async () => {
      try {
        this.logger.verbose(`(ElectronShell) locale switch request, locale=${locale}`);

        const route = useRoute();
        const updatedLocation = useLocaleRoute()(route, locale);
        if(!updatedLocation) {
          this.logger.warn(`(ElectronShell) updated location locale is empty, locale=${locale}, location=${route}`);
          this.onRequestShowExceptionDialog('warning');
          return;
        }
        await navigateTo(updatedLocation, { external: false });
        
        this.logger.verbose(`(ElectronShell) locale switch request completed, locale=${locale}`);
      } catch(err: any) {
        this.logger.warn(`(ElectronShell) exception while executing locale switch request, locale=${locale}`, err);
        throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to set locale', 'error-stub');
      }
    });
  }

  onRequestSetTheme(theme: Theme) {
    vueNextTick(() => {
      try {
        this.logger.verbose(`(ElectronShell) theme switch request, theme=${theme}`);
        const { currentTheme, toggleTheme } = useThemeSettings();
        if(currentTheme.value === theme) {
          this.logger.verbose(`(ElectronShell) requested theme is the same as current, ignoring, theme=${theme}`);
          return;
        }
        this.logger.verbose(`(ElectronShell) switching to new theme, theme=${theme}`);
        toggleTheme();
      } catch(err: any) {
        this.logger.warn(`(ElectronShell) exception while executing theme switch request, theme=${theme}`, err);
        throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to toggle theme', 'error-stub');
      }
    });
  }

  onRequestLogout() {
    vueNextTick(async () => {
      try {
        this.logger.verbose('(ElectronShell) on request to logout');
        const signOutHelper = useSignOut((globalThis as any).$navLinkBuilder);
        this.logger.verbose('(ElectronShell) logging out');
        await signOutHelper.signOut();
      } catch(err: any) {
        this.logger.warn('(ElectronShell) exception while executing request to logout', err);
        throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'failed to logout', 'error-stub');
      }
    });
    return Promise.resolve();
  }

  registerHook<THook extends keyof ElectronShellHooks = keyof ElectronShellHooks>(name: THook, fn: ElectronShellHooks[THook]): void {
    this.hooks.hook(name, bind(fn, this) as any);
  }

  async callHook<THook extends keyof ElectronShellHooks = keyof ElectronShellHooks>(name: THook, ...params: HookFnParameters<ElectronShellHooks[THook]>): Promise<ReturnType<ElectronShellHooks[THook]> | undefined> {
    try {
      this.logger.verbose(`(ElectronShell) hook callback, name=${name}, params=[${JSON.stringify(params)}], winTitle=[${document.title}]`);
      const result = await this.hooks.callHook(name, ...params) as any;
      this.logger.debug(`(ElectronShell) hook callback completed, name=${name}, params=[${JSON.stringify(params)}], result=${isArrayLike(result) ? result.length : JSON.stringify(result)}, winTitle=[${document.title}]`);
      return result;
    } catch(err: any) {
      this.logger.warn(`(ElectronShell) hook callback failed, name=${name}, winTitle=[${document.title}]`, err);
      throw new AppException(AppExceptionCodeEnum.ELECTRON_INTEGRATION_ERROR, 'unknown error', 'error-stub');
    }
  }
  
  registerHooks() {
    this.logger.debug('(ElectronShell) registering hooks');
    
    this.registerHook('request:navigate-to-page', this.onRequestNavigateToPage);
    this.electronApi.onRequestNavigateToPage((_, page) => {
      this.callHook('request:navigate-to-page', page);
    });

    this.registerHook('request:show-exception', this.onRequestShowExceptionDialog);
    this.electronApi.onRequestShowExceptionDialog((_, type) => {
      this.callHook('request:show-exception', type);
    });

    this.registerHook('request:set-theme', this.onRequestSetTheme);
    this.electronApi.onRequestSetTheme((_, theme) => {
      this.callHook('request:set-theme', theme);
    });

    this.registerHook('request:set-locale', this.onRequestSetLocale);
    this.electronApi.onRequestSetLocale((_, locale) => {
      this.callHook('request:set-locale', locale);
    });

    this.registerHook('request:logout', this.onRequestLogout);
    this.electronApi.onRequestLogout((_) => {
      this.callHook('request:logout');
    });

    this.logger.debug('(ElectronShell) hooks were registered');
  }
}