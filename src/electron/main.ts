import { nativeImage, Tray, app, Menu, BrowserWindow, type WebPreferences, type Rectangle, type NativeImage } from 'electron';
import { spinWait, isDevEnv, AppConfig, AppPage, AppName } from '@golobe-demo/shared';
import { ElectronMainLogger, installLoggingHooks } from './app/logging';
import { navigateTo } from './app/navigation';
import { buildMenu } from './app/menu';
import { showNotification, showExceptionDialog } from './app/dialogs';
import type { IRendererClientBridge } from './interfaces';
import { RendererClientBridge } from './context-bridge';
import { consola } from 'consola';
import { pingServer, clearClientData } from './app/utils';
import { resolve } from 'pathe';
import { joinURL } from 'ufo';

const ChildWindowSize: Rectangle = { x: 0, y: 0, width: 640, height: 480 };

let Logger: ElectronMainLogger;
let MainWindow: BrowserWindow;
let ContextBridge: IRendererClientBridge;
let DefaultWindowPreferences: WebPreferences;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let TrayIcon: Tray;

try {
  Logger = new ElectronMainLogger();
} catch(err: any) {
  consola.error('cannot start app - failed to create logger', err);
  throw new Error('failed to start app');
}

/** App configuration */
try {
  Logger.verbose(`(Main) configuring app, name=${app.getName()}, version=${app.getVersion()}`);

  if(!AppConfig.electron) {
    consola.error('cannot start app - Electron configuration missed');
    Logger.error(`(Main) cannot start app - Electron configuration missed, name=${app.getName()}, version=${app.getVersion()}`);
    throw new Error('Electron configuration missed');
  }

  app.setAppLogsPath(Logger.getLogDir());
  installLoggingHooks(app, Logger);

  app.setAboutPanelOptions({
    applicationName: AppName,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: 'License MIT',
    website: 'https://github.com/i7en0v91/travel-agency-website'
  });

  app.disableHardwareAcceleration(); // for offscreen rendering

  DefaultWindowPreferences = {
    contextIsolation: true,
    sandbox: true,
    preload: resolve('electron/preload.js'),
    backgroundThrottling: false // for more consistent UX
  };

  if(AppConfig.electron.startup.resetClientData) {
    app.once('session-created', async (session) => {
      await clearClientData(session, Logger);
    });
  }

  app.on('web-contents-created', (event, contents) => {
    // see https://www.electronjs.org/docs/latest/tutorial/security#12-verify-webview-options-before-creation
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      Logger.verbose(`(Main) on attaching web view, src=${params.src}`);
      // Strip away preload scripts if unused or verify their location is legitimate
      delete webPreferences.preload;
      // Disable Node.js integration
      webPreferences.nodeIntegration = false;
      // Verify URL being loaded
      if (!params.src.startsWith(AppConfig.siteUrl)) {
        Logger.warn(`(Main) unexpected web view attach attempt, src=[${params.src}]`);
        event.preventDefault();
      }
    });

    // see https://www.electronjs.org/docs/latest/tutorial/security#13-disable-or-limit-navigation
    contents.on('will-navigate', (event, navigationUrl) => {
      Logger.verbose(`(Main) navigating to url=${navigationUrl}`);
      if(navigationUrl.toLowerCase().startsWith('mailto:')) {
        return;
      }
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== AppConfig.siteUrl) { // for simplicity considering only website's own urls as safe
        Logger.warn(`(Main) navigation to potentially unsafe external url=${navigationUrl}`);
        event.preventDefault();
      }
    });

    // see https://www.electronjs.org/docs/latest/tutorial/security#14-disable-or-limit-creation-of-new-windows
    contents.setWindowOpenHandler(({ url }) => {
      const parent = MainWindow;
      // for simplicity considering only website's own urls as safe and open it
      if (url.startsWith(AppConfig.siteUrl) || url.toLowerCase().startsWith('mailto:')) {
        // create another window attached to main instead of opening in a browser
        // setImmediate(() => { shell.openExternal(url); });
        return { 
          action: 'allow', 
          createWindow: (options) => {
            try {
              Logger.info(`(Main) creating new window at url=${url}, parent=${parent?.title}`);
              const childWindow = new BrowserWindow({ 
                ...options,
                show: false, 
                maximizable: true,
                minimizable: true,
                closable: true,
                autoHideMenuBar: false,
                webPreferences: DefaultWindowPreferences,
                parent
              });
              childWindow.setMenuBarVisibility(false);
              childWindow.setBounds(ChildWindowSize);
              setImmediate(async () => {
                try {
                  Logger.verbose(`(Main) loading new window at url=${url}`);
                  const loadTask = childWindow.loadURL(url);
                  childWindow.once('ready-to-show', () => {
                    Logger.verbose(`(Main) showing new window at url=${url}, title=${childWindow.title}`);
                    childWindow.show();
                  });
                  await loadTask;
                  Logger.verbose(`(Main) new window loaded at url=${url}, title=${childWindow.title}`);
                } catch(err: any) {
                  Logger.warn(`(Main) exception occured while loading window at url=${url}, parent=${parent?.title}`, err);
                  try {
                    childWindow.destroy();
                  } catch(err: any) {
                    Logger.warn(`(Main) exception occured while destroying window at url=${url}, parent=${parent?.title}`, err);
                  }
                }
              });
              Logger.debug(`(Main) new window created, parent=${parent?.title}, waiting to load at url=[${url}]`);
              return childWindow.webContents;
            } catch(err: any) {
              Logger.warn(`(Main) failed to create new window at url=${url}, parent=${parent?.title}`, err);
              showExceptionDialog('warning', ContextBridge, Logger);
              throw err;
            }
          }
        };
      } else {
        Logger.warn(`(Main) preventing creation of new window at potentially unsafe url=${url}`);
      }
      return { action: 'deny' };
    });
  });

  Logger.verbose(`(Main) app configuration completed, name=${app.getName()}, version=${app.getVersion()}`);
} catch(err: any) {
  Logger.error('(Main) failed to configure Electron app', err);
  throw err;
}

async function loadIcon(): Promise<NativeImage | undefined> {
  try {
    Logger.verbose('(Main) loading icon');
    const response = await fetch(joinURL(AppConfig.siteUrl, 'icon-512.png'));
    if(response) {
      const bytes = await response.bytes();
      const result = nativeImage.createFromBuffer(Buffer.from(bytes));
      Logger.verbose(`(Main) icon loaded, width=${result.getSize().width}, height=${result.getSize().height}`);
      return result;
    }
    Logger.warn('(Main) icon load failed - empty response');
  } catch(err: any) {
    Logger.warn('(Main) icon load failed', err);
  }
  return undefined;
}

async function openWebPage(): Promise<void> {
  if(!isDevEnv()) {
    consola.log('start app - waiting server is ready...');
    if(!await spinWait(
      async () => {
        return await pingServer(AppConfig.electron!.startup.timeoutMs, Logger);
      }, AppConfig.electron!.startup.timeoutMs
    )) {
      throw new Error('startup timeout');
    }
  }

  Logger.info(`(Main) initializing main page, url=${AppConfig.siteUrl}, prefs=[${JSON.stringify(DefaultWindowPreferences)}]`);
  const icon = await loadIcon();
  if(icon) {
    TrayIcon = new Tray(icon);
  }
  MainWindow = new BrowserWindow({
    webPreferences: DefaultWindowPreferences,
    icon
  });

  Logger.verbose(`(Main) setting context bridge`);
  ContextBridge = new RendererClientBridge(app, MainWindow, Logger);

  Logger.debug(`(Main) resetting menu to minimum`);
  const emptyMenu = buildMenu([], MainWindow, ContextBridge, app, Logger);
  Menu.setApplicationMenu(emptyMenu);
  MainWindow.setMenuBarVisibility(true);
  MainWindow.setAutoHideMenuBar(false);

  app.on('login', async (event, webContents, details, authInfo /*, callback*/) => {
    Logger.info(`(Main) login requested, url=[${details?.url}]`, authInfo ?? {});
    event.preventDefault();
    
    navigateTo(AppPage.Login, MainWindow, ContextBridge, Logger);

    Logger.verbose(`(Main) login request completed, url=[${details?.url}]`, authInfo ?? {});
  });

  Logger.info(`(Main) opening main page, url=${AppConfig.siteUrl}`);
  await MainWindow.loadURL(AppConfig.siteUrl);
}

app.whenReady().then(async () => {
  try {
    await openWebPage();
  } catch(err: any) {
    Logger.error(`(Main) failed to open main page, url=${AppConfig.siteUrl}`, err);
    showNotification('fatal', 'unknown error', undefined, Logger, MainWindow);
  }
});

app.on('window-all-closed', () => {
  Logger.verbose('(Main) all window closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});