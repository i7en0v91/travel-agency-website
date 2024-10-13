import { clampTextLine, AppPage, getI18nResName2, getI18nResName3, type Theme, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, AppConfig } from '@golobe-demo/shared';
import { DeviceSizeEnum, DeviceSizeBreakpointsMap } from './../helpers/constants';
import orderBy from 'lodash-es/orderBy';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import throttle from 'lodash-es/throttle';
import groupBy from 'lodash-es/groupBy';
import keys from 'lodash-es/keys';
import flatten from 'lodash-es/flatten';
import { parseURL, stringifyParsedURL, stringifyQuery } from 'ufo';
import set from 'lodash-es/set';
import { getCommonServices } from './service-accessors';

export function getLastSelectedOptionStorageKey (optionCtrlKey: string) {
  return `lastOptBtn:${optionCtrlKey}`;
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


function testRectIntersection (rect1: DOMRect, rect2: DOMRect): boolean {
  return !((rect1.left > rect2.right) || (rect1.bottom < rect2.top) || (rect1.right < rect2.left) || (rect1.top > rect2.bottom));
}

function isElementItselfVisible (element: HTMLElement) {
  const isTransparent = ((element.style.opacity?.length ?? 0) > 0) && element.style.opacity.split('.').every((p) => { return parseInt(p) === 0; });
  const isNotDisplayed = element.style.display === 'none' && !element.className.includes('nav-search-page-links'); // handle .nav-search-page-links separately because of 'display: none' style added by vue's Trransition
  const isInvisible = window.getComputedStyle(element).visibility === 'hidden';
  const isOutOfViewport = !isInViewport(element, true);
  return !(isNotDisplayed || isInvisible || isOutOfViewport || isTransparent);
}

function isElementHiddenOverflowVisible (testElement: HTMLElement, parentElement?: HTMLElement | null) : boolean {
  if (!parentElement) {
    if (!testElement.parentElement) {
      return true;
    }
    return isElementHiddenOverflowVisible(testElement, testElement.parentElement);
  }

  const parentClientRect = parentElement.getBoundingClientRect();
  const testElemRect = testElement.getBoundingClientRect();
  if (parentElement.className.includes('hidden-overflow-nontabbable') && !testRectIntersection(testElemRect, parentClientRect)) {
    return false;
  }

  if (!parentElement.parentElement) {
    return true;
  }
  return isElementHiddenOverflowVisible(testElement, parentElement.parentElement);
}

function hasHiddenParent (element: HTMLElement) : boolean {
  if (element.className.includes('app-track') || element.tagName.toLowerCase() === 'body') {
    return false;
  }
  if (element.className.includes('no-hidden-parent-tabulation-check')) {
    return false;
  }
  if (!isElementItselfVisible(element)) {
    return true;
  }
  if (!element.parentElement) {
    return false;
  }
  return hasHiddenParent(element.parentElement);
}

export function isElementVisible (element: HTMLElement) {
  const isTransparent = ((element.style.opacity?.length ?? 0) > 0) && element.style.opacity.split('.').every((p) => { return parseInt(p) === 0; });
  const hiddenOverflowVisibilityCheck = !element.className.includes('hidden-overflow-nontabbable') || isElementHiddenOverflowVisible(element);
  const hasHiddenParentCheck = element.className.includes('no-hidden-parent-tabulation-check') || !hasHiddenParent(element);
  const viewportCheck = isInViewport(element, true);
  return viewportCheck && hasHiddenParentCheck && !isTransparent && hiddenOverflowVisibilityCheck;
}

export function calculateTabIndicies (rects: {x: number, y: number, width: number, height: number}[], snapSize = 1): number[] {
  function snapToGrid (value: number) {
    return Math.floor(value / snapSize) * snapSize;
  }

  return orderBy(
    zip(
      range(1, rects.length + 1),
      orderBy(rects.map((r, idx) => {
        return {
          idx,
          cx: snapToGrid(r.x + r.width / 2),
          cy: snapToGrid(r.y + r.height / 2)
        };
      }), ['cy', 'cx'], ['asc', 'asc']).map(r => r.idx + 1)
    ), ['1'], ['asc'])
    .map(r => r[0]!);
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
    iconClass: isHorizontalNav ? 'rotate-90 w-0 lg:w-6' : 'rotate-90',
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
    verticalNav: 3,
    showOnErrorPage: false
  },{
    kind: 'signup' as const,
    labelResName: getI18nResName2('nav', 'signUp'),
    icon: 'i-mdi-light-account',
    iconClass: isHorizontalNav ? 'hidden' : undefined,
    authStatus: false,
    verticalNav: 4,
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
  
