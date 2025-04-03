import { getLocaleFromUrl, type Locale, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import { parseURL, stringifyParsedURL } from 'ufo';
import { usePreviewState } from './../composables/preview-state';
import type { INavLinkBuilder } from './nav-link-builder';
import { getClientServices, getCommonServices } from '../helpers/service-accessors';
import { formatAuthCallbackUrl } from './../helpers/dom';
import type { UserAccountStore } from './../stores/user-account-store';

export interface ISignOut {
  signOut(): Promise<void>;
}

async function getBookingPageSignOutUrl (
  userAccountStore: UserAccountStore, 
  navLinkBuilder: INavLinkBuilder, 
  locale: Locale,
  logger: IAppLogger
): Promise<string> {
  logger.debug('obtaining booking signout url', locale);
  try {
    const route = useRoute();

    const bookingParam = route.params.id!.toString();
    const bookingId = bookingParam;
    const offerBookingInfo = await userAccountStore.getBookingOfferInfo(bookingId);
    const { id: offerId, offerKind } = offerBookingInfo;
    const urlPath = offerKind === 'flights' ? 
      navLinkBuilder.buildLink(`/${getPagePath(AppPage.FlightDetails)}/${offerId}`, locale) : 
      navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offerId}`, locale as Locale);

    const parsedRoute = parseURL(route.fullPath);
    parsedRoute.pathname = urlPath;
    const url = stringifyParsedURL(parsedRoute);
    logger.debug('using booking signout url', { bookingId, url });
    return url;
  } catch (err: any) {
    logger.warn('failed to obtain booking signout url', err, locale);
    return navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale);
  }
}

export function useSignOut (): ISignOut {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseSignOut' });
  const { signOut: nuxtAuthSignOut, status } = useAuth();
  const navLinkBuilder = useNavLinkBuilder();
  const { enabled } = usePreviewState();
  
  async function signOut(): Promise<void> {
    if(status.value !== 'authenticated') {
      logger.verbose('ignoring sign out request, user is not authenticated');
      return;
    }

    logger.info('signing out');
    const route = useRoute();
    const locale = getLocaleFromUrl(route.fullPath);
    
    let callbackUrl = route.fullPath;
    if (callbackUrl.includes(getPagePath(AppPage.BookingDetails))) {
      callbackUrl = await getBookingPageSignOutUrl(
        getClientServices().userAccountStore!, 
        navLinkBuilder, 
        locale as Locale, 
        logger
      );
    }
    callbackUrl = formatAuthCallbackUrl(callbackUrl, enabled);
  
    nuxtAuthSignOut({ callbackUrl, redirect: true });
    logger.verbose('signing out compeleted');
  }
  
  return {
    signOut
  };
}
