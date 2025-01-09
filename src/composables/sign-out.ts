import { getLocaleFromUrl, type Locale, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import { parseURL, stringifyParsedURL } from 'ufo';
import { usePreviewState } from './../composables/preview-state';
import type { INavLinkBuilder } from './nav-link-builder';
import { getCommonServices } from '../helpers/service-accessors';
import { formatAuthCallbackUrl } from './../helpers/dom';

export interface ISignOut {
  signOut(): Promise<void>;
}

async function getBookingPageSignOutUrl (logger: IAppLogger, navLinkBuilder: INavLinkBuilder, locale: Locale): Promise<string> {
  logger.debug(`(sign-out) obtaining booking signout url: locale=${locale}`);
  try {
    const route = useRoute();

    const bookingParam = route.params.id!.toString();
    const bookingId = bookingParam;
    const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
    const offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId, false, undefined);
    const offerId = offerBookingStore.offerId;
    const offerKind = offerBookingStore.offerKind;
    const urlPath = offerKind === 'flights' ? navLinkBuilder.buildLink(`/${getPagePath(AppPage.FlightDetails)}/${offerId}`, locale) : navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offerId}`, locale as Locale);

    const parsedRoute = parseURL(route.fullPath);
    parsedRoute.pathname = urlPath;
    const url = stringifyParsedURL(parsedRoute);
    logger.debug(`(sign-out) using booking signout url: bookingId=${bookingId}, url=${url}`);
    return url;
  } catch (err: any) {
    logger.warn(`(sign-out) failed to obtain booking signout url: locale=${locale}`, err);
    return navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale);
  }
}


export function useSignOut (linkBuilder?: INavLinkBuilder): ISignOut {
  const logger = getCommonServices().getLogger();
  const { signOut: nuxtAuthSignOut, status } = useAuth();
  const navLinkBuilder = linkBuilder ?? useNavLinkBuilder();
  const { enabled } = usePreviewState();
  
  async function signOut(): Promise<void> {
    if(status.value !== 'authenticated') {
      logger.verbose('(sign-out) ignoring sign out request, user is not authenticated');
      return;
    }

    logger.info('(sign-out) signing out');
    const route = useRoute();
    const locale = getLocaleFromUrl(route.fullPath);
    
    let callbackUrl = route.fullPath;
    if (callbackUrl.includes(getPagePath(AppPage.BookingDetails))) {
      callbackUrl = await getBookingPageSignOutUrl(logger, navLinkBuilder, locale as Locale);
    }
    callbackUrl = formatAuthCallbackUrl(callbackUrl, enabled);
  
    nuxtAuthSignOut({ callbackUrl, redirect: true });
    logger.verbose('(sign-out) signing out compeleted');
  }
  
  return {
    signOut
  };
}
