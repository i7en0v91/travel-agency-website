import { clampTextLine, AppPage, getI18nResName2, getI18nResName3, type Theme, QueryPagePreviewModeParam, PreviewModeParamEnabledValue } from '@golobe-demo/shared';
import { DeviceSizeEnum, DeviceSizeBreakpointsMap } from './../helpers/constants';
import orderBy from 'lodash-es/orderBy';
import { parseURL, stringifyParsedURL, stringifyQuery } from 'ufo';
import set from 'lodash-es/set';

export function getLastSelectedTabStorageKey (tabCtrlKey: string) {
  return `lastSelTab:${tabCtrlKey}`;
}

export function isInViewport (element: HTMLElement, includeVeticallyScrollableTo = false) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  const separatedByXaxis = rect.bottom < 0 || rect.top > (window.innerHeight || html.clientHeight);
  const separatedByYaxis = rect.right < 0 || rect.left > (window.innerWidth || html.clientWidth);
  const res = (!separatedByXaxis || includeVeticallyScrollableTo) && !separatedByYaxis;
  return res;
}

export function getCurrentThemeSettings () {
  return (document.documentElement.dataset.theme as Theme);
};

export function setCurrentThemeSettings (value: Theme) {
  document.documentElement.dataset.theme = value;
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(value);
};

export function formatAuthCallbackUrl (url: string, preivewMode: boolean): string {
  if(!url || url === '/') {
    return '/';
  }

  const parsedUrl = parseURL(url);
  parsedUrl.host = parsedUrl.protocol = undefined;
  if(preivewMode) {
    parsedUrl.search = stringifyQuery(set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue));
  }
  const urlWithoutHost = stringifyParsedURL(parsedUrl);
  return urlWithoutHost.startsWith('/') ? urlWithoutHost : `/${urlWithoutHost}`;
}

export function getPreferredTheme (): Theme | undefined {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    } else {
      return 'dark';
    }
  }
  return undefined;
};

export function isPrefersReducedMotionEnabled (): boolean {
  const mediaQueryResult = window.matchMedia ? window.matchMedia('(prefers-reduced-motion)') : undefined;
  return mediaQueryResult !== undefined && (mediaQueryResult.media === 'reduce' || (mediaQueryResult.matches && mediaQueryResult.media === '(prefers-reduced-motion)'));
}

export function getCurrentDeviceSize (): DeviceSizeEnum {
  const deviceSizesOrdered = orderBy(Object.values(DeviceSizeEnum).map((x) => { return { value: x, width: DeviceSizeBreakpointsMap.get(x)! }; }), ['width'], ['desc']);
  for (let i = 0; i < deviceSizesOrdered.length; i++) {
    const deviceSize = deviceSizesOrdered[i];
    const mediaQuery = window.matchMedia(`only screen and (min-width: ${deviceSize.width}px)`);
    if (mediaQuery.matches) {
      return deviceSize.value;
    }
  }
  return DeviceSizeEnum.XS;
}

export function getUserMenuLinksInfo() {
  return [
    [{
      kind: 'avatar',
      labelResName: undefined,
      icon: undefined,
      toPage: undefined
    }], 
    [{
      kind: 'account',
      labelResName: getI18nResName3('nav', 'userBox', 'myAccount'),
      toPage: AppPage.Account,
      icon: 'i-heroicons-user-20-solid'
    },{
      kind: 'favourites',
      labelResName: getI18nResName3('nav', 'userBox', 'favourites'),
      toPage: AppPage.Favourites,
      icon: 'i-heroicons-heart-solid'
    },{
      kind: 'payments',
      labelResName: getI18nResName3('nav', 'userBox', 'payments'),
      icon: 'i-mdi-credit-card',
      toPage: undefined
    },{
      kind: 'settings',
      labelResName: getI18nResName3('nav', 'userBox', 'settings'),
      icon: 'i-material-symbols-settings',
      toPage: undefined
    }],
    [],
    [{
      kind: 'support',
      labelResName: getI18nResName3('nav', 'userBox', 'support'),
      icon: 'i-material-symbols-support',
      toPage: undefined
    },{
      kind: 'signout',
      labelResName: getI18nResName3('nav', 'userBox', 'logout'),
      icon: 'i-heroicons-solid-login',
      toPage: undefined
    }]
  ];
}

export function getNavMenuLinksInfo(isHorizontalNav: boolean) {
  return [[{ 
    kind: 'nav-logo' as const,
    authStatus: undefined,
    verticalNav: false,
    showOnErrorPage: true
  },{
    kind: 'nav-toggler' as const,
    authStatus: undefined,
    verticalNav: false,
    showOnErrorPage: true
  },{ 
    kind: 'flights' as const,
    labelResName: getI18nResName2('nav', 'findFlights'),
    icon: 'i-material-symbols-flight',
    iconClass: isHorizontalNav ? 'w-0 lg:w-6' : undefined,
    toPage: AppPage.Flights,
    authStatus: undefined,
    verticalNav: 1,
    showOnErrorPage: true
  },{ 
    kind: 'stays' as const,
    labelResName: getI18nResName2('nav', 'findStays'),
    icon: 'i-material-symbols-bed',
    iconClass: isHorizontalNav ? 'w-0 lg:w-6' : undefined,
    toPage: AppPage.Stays,
    authStatus: undefined,
    verticalNav: 2,
    showOnErrorPage: true
  },{
    kind: 'site-search' as const,
    labelResName: isHorizontalNav ? undefined : getI18nResName3('nav', 'search', 'navItem'),
    icon: isHorizontalNav ? undefined : 'i-heroicons-magnifying-glass',
    iconClass: undefined,
    authStatus: undefined,
    verticalNav: 3,
    showOnErrorPage: true
  }],[{
    kind: 'favourites' as const,
    labelResName: getI18nResName3('nav', 'userBox', 'favourites'),
    icon: 'i-heroicons-heart-solid',
    iconClass: isHorizontalNav ? 'w-0 lg:w-6' : undefined,
    toPage: AppPage.Favourites,
    authStatus: true,
    verticalNav: false,
    showOnErrorPage: false
  },{
    kind: 'locale-switcher' as const,
    authStatus: undefined,
    verticalNav: false,
    showOnErrorPage: false
  },{
    kind: 'theme-switcher' as const,
    authStatus: undefined,
    verticalNav: false,
    showOnErrorPage: false
  },{
    kind: 'login' as const,
    labelResName: getI18nResName2('nav', 'login'),
    icon: 'i-heroicons-solid-login',
    iconClass: isHorizontalNav ? 'hidden' : 'rotate-180',
    authStatus: false,
    verticalNav: 4,
    showOnErrorPage: false
  },{
    kind: 'signup' as const,
    labelResName: getI18nResName2('nav', 'signUp'),
    icon: 'i-mdi-light-account',
    iconClass: isHorizontalNav ? 'hidden' : undefined,
    authStatus: false,
    verticalNav: 5,
    showOnErrorPage: false
  },{ 
    kind: 'nav-user' as const,
    authStatus: true,
    verticalNav: false,
    showOnErrorPage: false
  }]];
}

export function formatAvatarLabel(firstName: string | undefined, lastName: string | undefined) {
  return `${clampTextLine(`${firstName ?? '' }`, 30)} ${(lastName ? `${lastName.substring(0, 1).toUpperCase()}.`: '')}`;
}

  
