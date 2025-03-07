import { type Locale, localizePath, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, AppPage, getPagePath, type IAppLogger } from '@golobe-demo/shared';
import { UserAccountTabAccount, UserAccountTabGroup, UserAccountTabPayments } from './../helpers/constants';
import set from 'lodash-es/set';
import { parseQuery, parseURL, stringifyParsedURL, withQuery } from 'ufo';
import assign from 'lodash-es/assign';
import { usePreviewState } from './../composables/preview-state';
import { getClientServices, getCommonServices } from '../helpers/service-accessors';
import { type ISignOut, useSignOut } from './../composables/sign-out';

function isCurrentlyOnAccountPage (route: ReturnType<typeof useRoute>) {
  return route.path.includes(`/${getPagePath(AppPage.Account)}`);
};

async function handleSignOutClick (signOutHelper: ISignOut): Promise<void> {
  await signOutHelper.signOut();
}

function clickOnTab(tabSelector: string) {
  const tabEl = (document.querySelector(tabSelector) as HTMLElement);
  tabEl?.click();
  tabEl?.blur();
}

async function handlePaymentsClick (
  navLinkBuilder: INavLinkBuilder, 
  route: ReturnType<typeof useRoute>, 
  locale: Locale, 
  isOgImageRequest: boolean,
  controlValuesStore: ReturnType<typeof useControlValuesStore>,
  logger: IAppLogger
): Promise<void> {
  logger.verbose('handling payments menu click', { locale, isOgImageRequest });
  const onAccountPage = isCurrentlyOnAccountPage(route);
  if(onAccountPage) {
    clickOnTab('[role="tablist"] button:last-child');
  } else {
    // set payment tab to be automatically selected on mount
    await controlValuesStore.setValue(
      UserAccountTabGroup, 
      UserAccountTabPayments
    );
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale));
  }
  logger.verbose('payments menu click handler completed', { locale, isOgImageRequest });
}

async function handleSettingsClick (
  navLinkBuilder: INavLinkBuilder, 
  route: ReturnType<typeof useRoute>, 
  locale: Locale, 
  isOgImageRequest: boolean, 
  controlValuesStore: ReturnType<typeof useControlValuesStore>,
  logger: IAppLogger
): Promise<void> {
  logger.verbose('handling settings menu click', { locale, isOgImageRequest });
  const onAccountPage = isCurrentlyOnAccountPage(route);

  if(onAccountPage) {
    clickOnTab('[role="tablist"] button');
  } else {
    // set payment tab to be automatically selected on mount
    await controlValuesStore.setValue(
      UserAccountTabGroup, 
      UserAccountTabAccount
    );
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale));
  }
  logger.verbose('settings menu click handler completed', { locale, isOgImageRequest });
}

type MenuClickHandlerType = 'signout' | 'payments' | 'settings';
export interface INavLinkBuilder {
  buildPageLink(htmlPage: AppPage, locale: Locale, query?: any): string;
  buildLink(navLink: string, locale: Locale, query?: any): string;
  menuItemHandlers: { [P in MenuClickHandlerType]: () => Promise<void> }
}

export function useNavLinkBuilder (): INavLinkBuilder {
  let result: INavLinkBuilder | undefined = undefined;

  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseNavLinkBuilder' });
  const { enabled } = usePreviewState();
  const route = useRoute();
  const { locale } = useI18n();
  const nuxtApp = useNuxtApp();
  const isOgImageRequest = !!nuxtApp.ssrContext?.event.context.ogImageContext;

  let signOutHelper: ISignOut | undefined = undefined;
  const signOutMenuClickHandler = async () => await handleSignOutClick(signOutHelper!);
  
  const paymentsMenuClickHandler = async () => {
    const controlValuesStore = getClientServices().lazy.controlValuesStore;
    return await handlePaymentsClick(
      result!,
      route,
      locale.value as Locale,
      isOgImageRequest,
      controlValuesStore!,
      logger);
  };

  const settingsMenuClickHandler = async () => {
    const controlValuesStore = getClientServices().lazy.controlValuesStore;
    await handleSettingsClick(
      result!,
      route,
      locale.value as Locale,
      isOgImageRequest,
      controlValuesStore!,
      logger
    );
  };

  const buildPageLink = (htmlPage: AppPage, locale: Locale, query?: any): string => {
    const result = withQuery(localizePath(htmlPage === AppPage.Index ? '/' : getPagePath(htmlPage), locale), enabled ? (set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : (query ?? {}));
    logger.debug('build page link', { page: htmlPage.valueOf(), locale, preview: enabled, result });
    return result;
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
  signOutHelper = useSignOut(result);
  
  return result;
}
