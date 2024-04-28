<script setup lang="ts">

import { withQuery } from 'ufo';
import { updateTabIndices, isPrefersReducedMotionEnabled } from './../../shared/dom';
import { type ActivePageLink, type EntityId, type NavBarMode, type OfferKind } from './../../shared/interfaces';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import NavLink from './nav-link.vue';
import NavUser from './nav-user.vue';
import NavLogo from './nav-logo.vue';
import NavSearchPageLinks from './nav-search-page-links.vue';
import LocaleSwitcher from './locale-switcher.vue';
import ThemeSwitcher from './theme-switcher.vue';
import { PagePath, AllPagePaths, KeyCodeEsc } from './../../shared/constants';
import { isLandingPageUrl } from './../../shared/common';

const localePath = useLocalePath();
const { status } = useAuth();

interface IProps {
  ctrlKey: string,
  mode: NavBarMode
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const nuxtApp = useNuxtApp();
const route = useRoute();

const collapsed = ref(true);
const toggling = ref(false);

const navBarEl = shallowRef<HTMLElement>();

const userAccountStore = useUserAccountStore();
userAccountStore.getUserAccount(); // start auth session refreshing in background

async function getBookingOfferKind (bookingId: EntityId): Promise<OfferKind> {
  logger.verbose(`(NavUser) obtaining booking offer kind: ctrlKey=${props.ctrlKey}, bookingId=${bookingId}`);
  const offerBookingStoreFactory = useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
  const offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId, !!nuxtApp.ssrContext?.event.context.ogImageRequest, nuxtApp.ssrContext?.event);
  const offerId = offerBookingStore.offerId;
  const offerKind = offerBookingStore.offerKind;
  logger.verbose(`(NavUser) booking offer kind obtained: ctrlKey=${props.ctrlKey}, bookingId=${bookingId}, offerId=${offerId}, offerKind=${offerKind}`);
  return offerKind;
}

async function getActivePageLink () : Promise<ActivePageLink | undefined> {
  const currentPage = isLandingPageUrl(route.path) ? PagePath.Index : AllPagePaths.find(pp => pp !== PagePath.Index && route.path.includes(`/${pp.valueOf()}`));
  if (currentPage === undefined) {
    logger.warn(`(NavBar) failed to detected current page, ctrlKey=${props.ctrlKey}, page=${route.path}`);
    return undefined;
  }

  let result: ActivePageLink | undefined;
  switch (currentPage) {
    case PagePath.BookFlight:
    case PagePath.FindFlights:
    case PagePath.FlightDetails:
    case PagePath.Flights:
      result = PagePath.Flights;
      break;
    case PagePath.BookStay:
    case PagePath.FindStays:
    case PagePath.StayDetails:
    case PagePath.Stays:
      result = PagePath.Stays;
      break;
    case PagePath.Favourites:
      result = PagePath.Favourites;
      break;
    default:
      result = undefined;
      break;
  }
  if (!result && currentPage === PagePath.BookingDetails) {
    logger.verbose(`(NavBar) current page link is booking page, detecting offer kind, ctrlKey=${props.ctrlKey}, path=${route.path}`);
    try {
      const bookingParam = route.params.id!.toString();
      const bookingId = parseInt(bookingParam);
      const offerKind = await getBookingOfferKind(bookingId);
      result = offerKind === 'flights' ? PagePath.Flights : PagePath.Stays;
    } catch (err: any) {
      logger.warn(`(NavUser) failed to obtain booking offer kind url: ctrlKey=${props.ctrlKey}, path=${route.path}`, err);
      result = undefined;
    }
  }

  logger.debug(`(NavBar) active page link obtained, ctrlKey=${props.ctrlKey}, page=${result ?? 'none'}, `);
  return result;
}

const activePageLink = ref<ActivePageLink | undefined>(undefined);

function isAnimated (): boolean {
  return !isPrefersReducedMotionEnabled();
}

function togglePageLinksMenu () {
  if (!toggling.value) {
    logger.debug(`(NavBar) toggling navbar, ctrlKey=${props.ctrlKey}, new state collapsed=${!collapsed.value}`);
    collapsed.value = !collapsed.value;
    toggling.value = isAnimated() && true;
  } else {
    logger.verbose(`(NavBar) wont toggle navbar, it is currently toggling, ctrlKey=${props.ctrlKey}`);
  }
}

function onPageLinksToggled () {
  logger.debug(`(NavBar) page links toggled, ctrlKey=${props.ctrlKey}, collapsed=${collapsed.value}`);
  toggling.value = false;
  updateTabIndices();
}

function onLinkClicked () {
  if (!toggling.value && !collapsed.value) {
    logger.verbose(`(NavBar) locale changed, collapsing, ctrlKey=${props.ctrlKey}`);
    toggling.value = isAnimated() && true;
    setTimeout(() => {
      collapsed.value = true;
    }, 0);
  }
}

const cssClass = computed(() => `nav-bar ${props.mode === 'inApp' ? 'nav-bar-inapp' : 'nav-bar-landing'}`);
const isErrorPage = useError().value;

function handleKeyup (e: KeyboardEvent) {
  if (e.key?.toLowerCase() === KeyCodeEsc.toLowerCase() && !toggling.value && !collapsed.value) {
    logger.debug(`(NavBar) ESC pressed, collapsing, ctrlKey=${props.ctrlKey}`);
    togglePageLinksMenu();
  }
}

onMounted(async () => {
  watch(() => route.path, () => {
    logger.debug(`(NavBar) route changed, updating active page link, ctrlKey=${props.ctrlKey}, route=${route.path}`);
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
  <nav id="nav-main" ref="navBarEl" :aria-label="$t(getI18nResName2('ariaLabels', 'navMain'))" :class="cssClass">
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
            :to="localePath(`/${PagePath.Favourites}`)"
            :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')"
            :is-active="activePageLink === PagePath.Favourites"
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
              :to="withQuery(localePath(`/${PagePath.Login}`), { callbackUrl: withQuery(route.path, route.query) })"
              :text-res-name="getI18nResName2('nav', 'login')"
            />
            <NavLink
              link-class="btn nav-signup-btn"
              ctrl-key="navSignUp"
              :to="localePath(`/${PagePath.Signup}`)"
              :text-res-name="getI18nResName2('nav', 'signUp')"
            />
          </div>
        </ClientOnly>
      </div>
    </div>
  </nav>
</template>
