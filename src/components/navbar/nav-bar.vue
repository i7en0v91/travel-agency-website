<script setup lang="ts">
import { type EntityId, type OfferKind, lookupPageByUrl, AppPage, SystemPage, KeyCodeEsc, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import type { ActivePageLink, NavBarMode } from './../../types';
import { formatAuthCallbackUrl, updateTabIndices, isPrefersReducedMotionEnabled } from './../../helpers/dom';
import { withQuery } from 'ufo';
import NavLink from './nav-link.vue';
import NavUser from './nav-user.vue';
import NavLogo from './nav-logo.vue';
import NavSearchPageLinks from './nav-search-page-links.vue';
import LocaleSwitcher from './locale-switcher.vue';
import ThemeSwitcher from './theme-switcher.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

const { status } = useAuth();
const { enabled } = usePreviewState();

interface IProps {
  ctrlKey: string,
  mode: NavBarMode
}
const { ctrlKey, mode } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const nuxtApp = useNuxtApp();
const route = useRoute();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const collapsed = ref(true);
const toggling = ref(false);

const userAccountStore = useUserAccountStore();
userAccountStore.getUserAccount(); // start auth session refreshing in background

async function getBookingOfferKind (bookingId: EntityId): Promise<OfferKind> {
  logger.verbose(`(NavUser) obtaining booking offer kind: ctrlKey=${ctrlKey}, bookingId=${bookingId}`);
  const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
  const offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId, !!nuxtApp.ssrContext?.event.context.ogImageContext, nuxtApp.ssrContext?.event);
  const offerId = offerBookingStore.offerId;
  const offerKind = offerBookingStore.offerKind;
  logger.verbose(`(NavUser) booking offer kind obtained: ctrlKey=${ctrlKey}, bookingId=${bookingId}, offerId=${offerId}, offerKind=${offerKind}`);
  return offerKind;
}

async function getActivePageLink () : Promise<ActivePageLink | undefined> {
  const currentPage = lookupPageByUrl(route.path);
  if (currentPage === undefined) {
    logger.warn(`(NavBar) failed to detected current page, ctrlKey=${ctrlKey}, page=${route.path}`);
    return undefined;
  }

  if(currentPage === SystemPage.Drafts) {
    logger.debug(`(NavBar) current page is system, ctrlKey=${ctrlKey}, path=${route.path}`);
    return undefined;
  }

  let result: ActivePageLink | undefined;
  switch (currentPage) {
    case AppPage.BookFlight:
    case AppPage.FindFlights:
    case AppPage.FlightDetails:
    case AppPage.Flights:
      result = AppPage.Flights;
      break;
    case AppPage.BookStay:
    case AppPage.FindStays:
    case AppPage.StayDetails:
    case AppPage.Stays:
      result = AppPage.Stays;
      break;
    case AppPage.Favourites:
      result = AppPage.Favourites;
      break;
    default:
      result = undefined;
      break;
  }
  if (!result && currentPage === AppPage.BookingDetails) {
    logger.verbose(`(NavBar) current page link is booking page, detecting offer kind, ctrlKey=${ctrlKey}, path=${route.path}`);
    try {
      const bookingParam = route.params.id!.toString();
      const bookingId = bookingParam;
      const offerKind = await getBookingOfferKind(bookingId);
      result = offerKind === 'flights' ? AppPage.Flights : AppPage.Stays;
    } catch (err: any) {
      logger.warn(`(NavUser) failed to obtain booking offer kind url: ctrlKey=${ctrlKey}, path=${route.path}`, err);
      result = undefined;
    }
  }

  logger.debug(`(NavBar) active page link obtained, ctrlKey=${ctrlKey}, page=${result ?? 'none'}, `);
  return result;
}

const activePageLink = ref<ActivePageLink | undefined>(undefined);

function isAnimated (): boolean {
  return !isPrefersReducedMotionEnabled();
}

function togglePageLinksMenu () {
  if (!toggling.value) {
    logger.debug(`(NavBar) toggling navbar, ctrlKey=${ctrlKey}, new state collapsed=${!collapsed.value}`);
    collapsed.value = !collapsed.value;
    toggling.value = isAnimated() && true;
  } else {
    logger.verbose(`(NavBar) wont toggle navbar, it is currently toggling, ctrlKey=${ctrlKey}`);
  }
}

function onPageLinksToggled () {
  logger.debug(`(NavBar) page links toggled, ctrlKey=${ctrlKey}, collapsed=${collapsed.value}`);
  toggling.value = false;
  updateTabIndices();
}

function onLinkClicked () {
  if (!toggling.value && !collapsed.value) {
    logger.verbose(`(NavBar) locale changed, collapsing, ctrlKey=${ctrlKey}`);
    toggling.value = isAnimated() && true;
    setTimeout(() => {
      collapsed.value = true;
    }, 0);
  }
}

const cssClass = computed(() => `nav-bar ${mode === 'inApp' ? 'nav-bar-inapp' : 'nav-bar-landing'}`);
const isErrorPage = useError().value;

function handleKeyup (e: KeyboardEvent) {
  if (e.key?.toLowerCase() === KeyCodeEsc.toLowerCase() && !toggling.value && !collapsed.value) {
    logger.debug(`(NavBar) ESC pressed, collapsing, ctrlKey=${ctrlKey}`);
    togglePageLinksMenu();
  }
}

onMounted(async () => {
  watch(() => route.path, () => {
    logger.debug(`(NavBar) route changed, updating active page link, ctrlKey=${ctrlKey}, route=${route.path}`);
    setTimeout(async () => {
      activePageLink.value = await getActivePageLink();
    }, 0);
  });
  activePageLink.value = await getActivePageLink();

  document.addEventListener('keyup', handleKeyup);
});

onBeforeUnmount(() => {
  document.removeEventListener('keyup', handleKeyup);
});

</script>

<template>
  <nav id="nav-main" :aria-label="$t(getI18nResName2('ariaLabels', 'navMain'))" :class="cssClass">
    <NavSearchPageLinks
      ctrl-key="navSearchPageLinks"
      :mode="mode"
      :collapsed="collapsed"
      :toggling="toggling"
      :active-page-link="activePageLink"
      @toggled="onPageLinksToggled"
      @link-clicked="onLinkClicked"
    />
    <NavLogo ctrl-key="navLogo" :mode="mode" />
    <div class="nav-toggler-div mt-xs-2 mt-l-0">
      <button class="nav-toggler ml-xs-1 mb-xs-2 brdr-1" type="button" role="switch" :aria-checked="collapsed" @click="togglePageLinksMenu">
&nbsp;
      </button>
    </div>
    <div class="nav-controlbox mt-xs-2 mt-s-0">
      <div v-if="!isErrorPage" class="nav-page-settings">
        <div v-if="status === 'authenticated'" class="nav-user-favourites-div">
          <NavLink
            ctrl-key="navLinkFavourites"
            link-class="nav-user-favourites mr-l-3"
            :to="navLinkBuilder.buildPageLink(AppPage.Favourites, locale as Locale)"
            :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')"
            :is-active="activePageLink === AppPage.Favourites"
            icon="favourite"
          />
        </div>
        <LocaleSwitcher ctrl-key="navLocaleSwitcher" />
        <ThemeSwitcher ctrl-key="navThemeSwitcher" />
        <ClientOnly>
          <NavUser v-if="status==='authenticated'" ctrl-key="navUser" />
          <div v-else class="nav-login">
            <NavLink
              :id="`${ctrlKey}-login-link`"
              ctrl-key="navLogin"
              link-class="ml-l-2"
              :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale, { originPath: formatAuthCallbackUrl(withQuery(route.path, route.query), enabled)})"
              :text-res-name="getI18nResName2('nav', 'login')"
            />
            <NavLink
              link-class="btn nav-signup-btn"
              ctrl-key="navSignUp"
              :to="navLinkBuilder.buildPageLink(AppPage.Signup, locale as Locale)"
              :text-res-name="getI18nResName2('nav', 'signUp')"
            />
          </div>
        </ClientOnly>
      </div>
    </div>
  </nav>
</template>
