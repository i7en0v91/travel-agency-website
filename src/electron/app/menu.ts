import { shell, type App, type BrowserWindow, Menu, MenuItem, type MenuItemConstructorOptions } from 'electron';
import type { ElectronMainLogger } from './logging';
import type { NavSubItemRole, NavProps, IRendererClientBridge } from '../interfaces';
import { showNotification, showExceptionDialog } from './dialogs';
import { navigateTo } from './navigation';
import { setRendererTheme } from './theme';
import { AppConfig, AppPage } from '@golobe-demo/shared';

declare type NavUserMenuItemOptions = Omit<MenuItemConstructorOptions, 'id'> & { id: NavSubItemRole };
declare type ItemClickHandlerRole = MenuItemConstructorOptions['role'] | NavSubItemRole;
function handleItemClick(role: ItemClickHandlerRole, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger) {
  try {
    logger.verbose('item click handler', role);

    switch(role) {
      case 'flights':
        navigateTo(AppPage.Flights, win, bridge, logger);
        break;
      case 'stays':
        navigateTo(AppPage.Stays, win, bridge, logger);
        break;
      case 'login':
        navigateTo(AppPage.Login, win, bridge, logger);
        break;
      case 'signup':
        navigateTo(AppPage.Signup, win, bridge, logger);
        break;
      case 'profile':
        navigateTo(AppPage.Account, win, bridge, logger);
        break;
      case 'favourites':
        navigateTo(AppPage.Favourites, win, bridge, logger);
        break;
      case 'logout':
        bridge.logout();
        break;
      case 'go-back':
        if (win.webContents.navigationHistory.canGoBack()) {
          win.webContents.navigationHistory.goBack();
        }
        break;
      case 'go-next':
        if (win.webContents.navigationHistory.canGoForward()) {
          win.webContents.navigationHistory.goForward();
        }
        break;
      case 'index':
        navigateTo(AppPage.Index, win, bridge, logger);
        break;
      case 'theme:dark':
        setRendererTheme('dark', bridge, logger);
        break;
      case 'theme:light':
        setRendererTheme('light', bridge, logger);
        break;
      case 'locale:en':
        bridge.setLocale('en');
        break;
      case 'locale:fr':
        bridge.setLocale('fr');
        break;
      case 'locale:ru':
        bridge.setLocale('ru');
        break;
      case 'contact-us':
        setImmediate(() => { shell.openExternal(`mailto:${AppConfig.contactEmail}`); });
        break;
      case 'about':
        app.showAboutPanel();
        break;
    }

    logger.debug('item click handler completed', role);
  } catch(err: any) {
    logger.warn('exception occured inside item click handler', err, role);
    showExceptionDialog('warning', bridge, logger);
  }
};

function lookupMenuItemByRole(menu: Electron.Menu, role: NonNullable<MenuItem['role']>): MenuItem | null {
  return menu.items.find(i => i.role?.toLowerCase() === role.toLowerCase()) ?? null;
}

function mergeUserNavMenuItems(navUserMenuItems: NavUserMenuItemOptions[], menuRole: NonNullable<MenuItem['role']>, defaultMenu: MenuItem | null, logger: ElectronMainLogger): MenuItem {
  logger.debug('merging user navbar items', { menuRole, count: navUserMenuItems.length });

  let result: MenuItem;
  const isDefaultMenuEmpty = !defaultMenu?.submenu?.items?.length;
  if(!isDefaultMenuEmpty) {
    const alreadyFilled = defaultMenu.submenu!.items.some(i => { return navUserMenuItems.some(x => x.id === i.id); });
    const isMinimumMenuReset = !navUserMenuItems.length;
    if(!isMinimumMenuReset) {
      if(!alreadyFilled) {
        logger.debug('detected navbar menu has been already filled', menuRole);
        defaultMenu.submenu!.insert(0, new MenuItem({
          type: 'separator'
        }));
      } else {
        logger.debug('navbar menu will be populated with new items', menuRole);
      }
    }

    for(let i = navUserMenuItems.length - 1; i >= 0; i--) {
      const navUserMenuItem = navUserMenuItems[i];
      if(alreadyFilled) {
        const existingMenuItem = defaultMenu.submenu!.items.find(i => i.id === navUserMenuItem.id);
        if(existingMenuItem) {
          // menu item label cannot be changed dynamically
          // existingMenuItem.label = navUserMenuItem.label!;
        } else {
          logger.warn('cannot find navbar menu item to update', undefined, { menuRole, id: navUserMenuItem.id });
          const menuItem = new MenuItem(navUserMenuItem);
          menuItem.id = navUserMenuItem.id;
          defaultMenu.submenu!.insert(0, menuItem);  
        }
      } else {
        const menuItem = new MenuItem(navUserMenuItem);
        menuItem.id = navUserMenuItem.id;
        defaultMenu.submenu!.insert(0, new MenuItem(navUserMenuItem));
      }
    }
    result = defaultMenu;
  } else {
    logger.debug('default menu is empty', menuRole);
    result = new MenuItem({ 
      role: menuRole,
      submenu: navUserMenuItems
    });
  }

  logger.debug('user navbar items merged', { menuRole, count: navUserMenuItems.length });
  return result;
}

function buildFileMenu(defaultAppMenu: Electron.Menu, userNav: NavProps, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): MenuItem | null {
  logger.debug('building file menu');

  const defaultFileMenuItem = lookupMenuItemByRole(defaultAppMenu, 'fileMenu');
  const isDefaultMenuEmpty = !defaultFileMenuItem?.submenu?.items?.length;
  if(isDefaultMenuEmpty) {
    logger.warn('failed to obtain default file menu');
    showExceptionDialog('warning', bridge, logger);
  }

  const flightsNavItem = userNav.find(i => i.role === 'file')?.subItems.find(i => i.role === 'flights');
  const staysNavItem = userNav.find(i => i.role === 'file')?.subItems.find(i => i.role === 'stays');
  const goMainNavItem = userNav.find(i => i.role === 'file')?.subItems.find(i => i.role === 'index');
  const navSubmenus: NavUserMenuItemOptions[] = ([
    flightsNavItem ? { id: 'flights' as const, label: flightsNavItem.label, click: () => handleItemClick('flights', win, bridge, app, logger) } : undefined,
    staysNavItem ? { id: 'stays' as const, label: staysNavItem.label, click: () => handleItemClick('stays', win, bridge, app, logger) } : undefined,
    goMainNavItem ? { id: 'index' as const, label: goMainNavItem.label, click: () => handleItemClick('index', win, bridge, app, logger) } : undefined
  ].filter(i => !!i));
  if(!navSubmenus.length && isDefaultMenuEmpty) {
    logger.warn('file menu doesnt contain any items');  
    showExceptionDialog('warning', bridge, logger);
    return null;
  }
  const result = mergeUserNavMenuItems(navSubmenus, 'fileMenu', defaultFileMenuItem, logger);

  logger.debug('file menu built');
  return result;
}

function buildViewMenu(defaultAppMenu: Electron.Menu, userNav: NavProps, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): MenuItem | null {
  logger.debug('building view menu');

  const defaultViewMenuItem = lookupMenuItemByRole(defaultAppMenu, 'viewMenu');
  const isDefaultMenuEmpty = !defaultViewMenuItem?.submenu?.items?.length;
  if(isDefaultMenuEmpty) {
    logger.warn('failed to obtain default view menu');
    showExceptionDialog('warning', bridge, logger);
  }

  const themeNavItem = userNav.find(i => i.role === 'view:theme');
  const themeDarkNavItem = themeNavItem?.subItems.find(i => i.role === 'theme:dark');
  const themeLightNavItem = themeNavItem?.subItems.find(i => i.role === 'theme:light');
  const themeNavSubItems = [
    themeDarkNavItem ? { id: 'theme:dark' as const, label: themeDarkNavItem.label, click: () => handleItemClick('theme:dark', win, bridge, app, logger) } : undefined,
    themeLightNavItem ? { id: 'theme:light' as const, label: themeLightNavItem.label, click: () => handleItemClick('theme:light', win, bridge, app, logger) } : undefined,
  ].filter(i => !!i);

  const localeNavItem = userNav.find(i => i.role === 'view:locale');
  const localeEnNavItem = localeNavItem?.subItems.find(i => i.role === 'locale:en');
  const localeFrNavItem = localeNavItem?.subItems.find(i => i.role === 'locale:fr');
  const localeRuNavItem = localeNavItem?.subItems.find(i => i.role === 'locale:ru');
  const localeNavSubItems = [
    localeEnNavItem ? { id: 'locale:en' as const, label: localeEnNavItem.label, click: () => handleItemClick('locale:en', win, bridge, app, logger) } : undefined,
    localeFrNavItem ? { id: 'locale:fr' as const, label: localeFrNavItem.label, click: () => handleItemClick('locale:fr', win, bridge, app, logger) } : undefined,
    localeRuNavItem ? { id: 'locale:ru' as const, label: localeRuNavItem.label, click: () => handleItemClick('locale:ru', win, bridge, app, logger) } : undefined
  ].filter(i => !!i);

  const goBackNavItem = userNav.find(i => i.role === 'view')?.subItems.find(i => i.role === 'go-back');
  const goNextNavItem = userNav.find(i => i.role === 'view')?.subItems.find(i => i.role === 'go-next');
  
  const navSubmenus: NavUserMenuItemOptions[] = ([
    themeNavSubItems.length ? { id: 'view:theme' as const, label: themeNavItem!.label, submenu: themeNavSubItems } : undefined,
    localeNavSubItems.length ? { id: 'view:locale' as const, label: localeNavItem!.label, submenu: localeNavSubItems } : undefined,
    goBackNavItem ? { id: 'go-back' as const, label: goBackNavItem.label, click: () => handleItemClick('go-back', win, bridge, app, logger) } : undefined,
    goNextNavItem ? { id: 'go-next' as const, label: goNextNavItem.label, click: () => handleItemClick('go-next', win, bridge, app, logger) } : undefined
  ].filter(i => !!i));
  if(!navSubmenus.length && isDefaultMenuEmpty) {
    logger.warn('view menu doesnt contain any items');  
    showExceptionDialog('warning', bridge, logger);
    return null;
  }

  const result = mergeUserNavMenuItems(navSubmenus, 'viewMenu', defaultViewMenuItem, logger);

  logger.debug('view menu built');
  return result;
}

function buildAccountMenu(userNav: NavProps, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): MenuItem | null {
  logger.debug('building account menu');

  const accountMenuGroupItem = userNav.find(i => i.role === 'account');
  if(!accountMenuGroupItem) {
    const isMinimumMenuReset = !userNav.length;
    if(!isMinimumMenuReset) {
      logger.warn('account menu group item is missed');
      showExceptionDialog('warning', bridge, logger);
    }
    return null;
  }

  const loginNavItem = accountMenuGroupItem.subItems.find(i => i.role === 'login');
  const signupNavItem = accountMenuGroupItem.subItems.find(i => i.role === 'signup');
  const profileNavItem = accountMenuGroupItem.subItems.find(i => i.role === 'profile');
  const favouritesNavItem = accountMenuGroupItem.subItems.find(i => i.role === 'favourites');
  const signoutNavItem = accountMenuGroupItem.subItems.find(i => i.role === 'logout');

  const navSubmenus: MenuItemConstructorOptions[] = ([
    ...(loginNavItem ? [{ label: loginNavItem.label, click: () => handleItemClick('login', win, bridge, app, logger) }] : []),
    ...(signupNavItem ? [{ label: signupNavItem.label, click: () => handleItemClick('signup', win, bridge, app, logger) }] : []),
    ...(profileNavItem ? [{ label: profileNavItem.label, click: () => handleItemClick('profile', win, bridge, app, logger) }] : []),
    ...(favouritesNavItem ? [{ label: favouritesNavItem.label, click: () => handleItemClick('favourites', win, bridge, app, logger) }] : []),
    ...(signoutNavItem ? [{ type: 'separator' as const }, { label: signoutNavItem.label, click: () => handleItemClick('logout', win, bridge, app, logger) }] : [])
  ].filter(i => !!i));
  if(!navSubmenus.length) {
    logger.warn('account menu doesnt contain any items');  
    showExceptionDialog('warning', bridge, logger);
    return null;
  }

  const accountMenu: MenuItem = new MenuItem({
    label: accountMenuGroupItem.label,
    submenu: navSubmenus
  });

  logger.debug('account menu built');
  return accountMenu;
}

function buildHelpMenu(userNav: NavProps, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): MenuItem | null {
  logger.debug('building help menu');

  const contactNavItem = userNav.find(i => i.role === 'help')?.subItems.find(i => i.role === 'contact-us');
  const helpMenu: MenuItem = new MenuItem({
    role: 'help',
    submenu: [
      ...(contactNavItem ? [{ label: contactNavItem.label, click: () => handleItemClick('contact-us', win, bridge, app, logger) }] : []),
      { role: 'about', click: () => handleItemClick('about', win, bridge, app, logger) }
    ]
  });

  logger.debug('help menu built');
  return helpMenu;
}

function buildWindowMenu(defaultAppMenu: Electron.Menu, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): MenuItem | null {
  logger.debug('building window menu');

  const windowMenu = lookupMenuItemByRole(defaultAppMenu, 'windowMenu');
  if(!windowMenu) {
    logger.warn('failed to obtain window menu');  
    showExceptionDialog('warning', bridge, logger);
  }

  logger.debug('window menu built');
  return windowMenu;
}

export function buildMenu(userNav: NavProps, win: BrowserWindow, bridge: IRendererClientBridge, app: App, logger: ElectronMainLogger): Menu {
  try {
    logger.verbose('building app menu');

    const defaultAppMenu = Menu.getApplicationMenu();
    if(!defaultAppMenu) {
      throw new Error('failed to obtain default app menu');
    }

    const fileMenu = buildFileMenu(defaultAppMenu, userNav, win, bridge, app, logger);
    const accountMenu = buildAccountMenu(userNav, win, bridge, app, logger);
    const viewMenu = buildViewMenu(defaultAppMenu, userNav, win, bridge, app, logger);
    const windowMenu = buildWindowMenu(defaultAppMenu, win, bridge, app, logger);
    const helpMenu = buildHelpMenu(userNav, win, bridge, app, logger);
    
    const menuItems = [fileMenu, accountMenu, viewMenu, windowMenu, helpMenu].filter(i => !!i);
    const result = Menu.buildFromTemplate(menuItems);

    logger.verbose('app menu built, num', { tabs: result.items.length });
    return result;
  } catch(err: any) {
    logger.error('failed to build app menu', err);
    showNotification('fatal', 'failed to initialize app', undefined, logger);
    throw err;
  }
}