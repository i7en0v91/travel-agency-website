import { type Locale, localizePath, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import { formatAuthCallbackUrl, getLastSelectedOptionStorageKey } from './../helpers/dom';
import { UserAccountTabPayments, UserAccountOptionButtonAccount, UserAccountTabAccount, UserAccountOptionButtonGroup, UserAccountOptionButtonPayments } from './../helpers/constants';
import set from 'lodash-es/set';
import { parseQuery, parseURL, stringifyParsedURL, withQuery } from 'ufo';
import assign from 'lodash-es/assign';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';

function isCurrentlyOnAccountPage (route: ReturnType<typeof useRoute>) {
  return route.path.includes(`/${getPagePath(AppPage.Account)}`);
};

async function getBookingPageSignOutUrl (navLinkBuilder: INavLinkBuilder, locale: Locale, isOgImageRequest: boolean, route: ReturnType<typeof useRoute>, logger: IAppLogger): Promise<string> {
  logger.debug(`(NavLinkBuilder) obtaining booking signout url, locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
  try {
    const bookingParam = route.params.id!.toString();
    const bookingId = bookingParam;
    const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
    const offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId, isOgImageRequest);
    const offerId = offerBookingStore.offerId;
    const offerKind = offerBookingStore.offerKind;
    const urlPath = offerKind === 'flights' ? 
      navLinkBuilder.buildLink(`/${getPagePath(AppPage.FlightDetails)}/${offerId}`, locale) : 
      navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offerId}`, locale);

    const parsedRoute = parseURL(route.fullPath);
    parsedRoute.pathname = urlPath;
    const url = stringifyParsedURL(parsedRoute);
    logger.debug(`(NavLinkBuilder) using booking signout url, bookingId=${bookingId}, url=${url}, locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
    return url;
  } catch (err: any) {
    logger.warn(`(NavLinkBuilder) failed to obtain booking signout url: locale=${locale}, isOgImageRequest=${isOgImageRequest}`, err);
    return navLinkBuilder.buildPageLink(AppPage.Index, locale);
  }
}

async function handleSignOutClick (
  navLinkBuilder: INavLinkBuilder, 
  route: ReturnType<typeof useRoute>, 
  locale: Locale, 
  isOgImageRequest: boolean, 
  previewMode: boolean, 
  signOutFn: ReturnType<typeof useAuth>['signOut'],
  logger: IAppLogger
): Promise<void> {
  logger.verbose(`(NavLinkBuilder) handling sign out menu click: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
  let callbackUrl = route.fullPath;
  if (callbackUrl.includes(getPagePath(AppPage.BookingDetails))) {
    callbackUrl = await getBookingPageSignOutUrl(navLinkBuilder, locale, isOgImageRequest, route, logger);
  }
  callbackUrl = formatAuthCallbackUrl(callbackUrl, previewMode);
  await signOutFn({ callbackUrl, redirect: true });
  logger.verbose(`(NavLinkBuilder) sign out menu handler completed: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
  //hideDropdown();
}

async function handlePaymentsClick (
  navLinkBuilder: INavLinkBuilder, 
  route: ReturnType<typeof useRoute>, 
  locale: Locale, 
  isOgImageRequest: boolean,
  logger: IAppLogger
): Promise<void> {
  logger.verbose(`(NavLinkBuilder) handling payments menu click: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
  const onAccountPage = isCurrentlyOnAccountPage(route);
  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabPayments}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonPayments);
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale));
  }
  logger.verbose(`(NavLinkBuilder) payments menu click handler completed: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
}

async function handleSettingsClick (
  navLinkBuilder: INavLinkBuilder, 
  route: ReturnType<typeof useRoute>, 
  locale: Locale, 
  isOgImageRequest: boolean, 
  logger: IAppLogger
): Promise<void> {
  logger.verbose(`(NavLinkBuilder) handling settings menu click: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
  const onAccountPage = isCurrentlyOnAccountPage(route);
  //onMenuItemClick();

  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabAccount}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonAccount);
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale));
  }
  logger.verbose(`(NavLinkBuilder) settings menu click handler completed: locale=${locale}, isOgImageRequest=${isOgImageRequest}`);
}

type MenuClickHandlerType = 'signout' | 'payments' | 'settings';
export interface INavLinkBuilder {
  buildPageLink(htmlPage: AppPage, locale: Locale, query?: any): string;
  buildLink(navLink: string, locale: Locale, query?: any): string;
  menuItemHandlers: { [P in MenuClickHandlerType]: () => Promise<void> }
}

export function useNavLinkBuilder (): INavLinkBuilder {
  let result: INavLinkBuilder | undefined = undefined;

  const { enabled } = usePreviewState();
  const logger = getCommonServices().getLogger();
  const route = useRoute();
  const { locale } = useI18n();
  const nuxtApp = useNuxtApp();
  const { signOut } = useAuth();
  const isOgImageRequest = !!nuxtApp.ssrContext?.event.context.ogImageContext;

  const signOutMenuClickHandler = async () => await handleSignOutClick(
      result!, 
      route, 
      locale.value as Locale, 
      isOgImageRequest, 
      enabled,
      signOut,
      logger);
  
  const paymentsMenuClickHandler = async () => await handlePaymentsClick(
    result!,
    route,
    locale.value as Locale,
    isOgImageRequest,
    logger
  );

  const settingsMenuClickHandler = async () => await handleSettingsClick(
    result!,
    route,
    locale.value as Locale,
    isOgImageRequest,
    logger
  );

  const buildPageLink = (htmlPage: AppPage, locale: Locale, query?: any): string => {
    return withQuery(localizePath(htmlPage === AppPage.Index ? '/' : getPagePath(htmlPage), locale), enabled ? (set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : (query ?? {}));
  };

  const buildLink = (navLink: string, locale: Locale, query?: any): string => {
    const parsedLink = parseURL(navLink);
    parsedLink.host = parsedLink.protocol = undefined;
    if(query) {
      const navQuery = parsedLink.search?.length ? parseQuery(parsedLink.search) : {};
      query = assign(navQuery, query);
      parsedLink.search = '';
    }

    let pathname = stringifyParsedURL(parsedLink);
    if(pathname.startsWith('/') && pathname !== '/') {
      pathname = pathname.substring(1, pathname.length);
    }   
    return withQuery(localizePath(pathname, locale), enabled ? (set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : (query ?? {}));
  };

  result = {
    buildPageLink,
    buildLink,
    menuItemHandlers: {
      signout: signOutMenuClickHandler,
      payments: paymentsMenuClickHandler,
      settings: settingsMenuClickHandler
    }
  };
  return result;
}
