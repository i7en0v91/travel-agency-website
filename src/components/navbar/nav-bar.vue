<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { type EntityId, type OfferKind, lookupPageByUrl, AppPage, SystemPage, KeyCodeEsc, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import type { ActivePageLink, NavBarMode } from './../../types';
import { formatAuthCallbackUrl, updateTabIndices, isPrefersReducedMotionEnabled } from './../../helpers/dom';
import { withQuery } from 'ufo';
import NavLink from './nav-link.vue';
import NavLogo from './nav-logo.vue';
import NavSearchPageLinks from './nav-search-page-links.vue';
import LocaleSwitcher from './locale-switcher.vue';
import ThemeSwitcher from './theme-switcher.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

const { enabled } = usePreviewState();

interface IProps {
  ctrlKey: ControlKey,
  mode: NavBarMode,
  hardLinks: boolean
}
const { ctrlKey, mode } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'NavBar' });
const route = useRoute();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userAccountStore = useUserAccountStore();

const collapsed = ref(true);
const toggling = ref(false);

async function getBookingOfferKind (bookingId: EntityId): Promise<OfferKind> {
  logger.verbose('obtaining booking offer kind', { ctrlKey, bookingId });
  const userAccountStore = useUserAccountStore();
  const offerInfo = await userAccountStore.getBookingOfferInfo(bookingId);
  logger.verbose('booking offer kind obtained', { ctrlKey, bookingId, offerInfo });
  return offerInfo.offerKind;
}

async function getActivePageLink () : Promise<ActivePageLink | undefined> {
  const currentPage = lookupPageByUrl(route.path);
  if (currentPage === undefined) {
    logger.warn('failed to detected current page', undefined, { ctrlKey, page: route.path });
    return undefined;
  }

  if(currentPage === SystemPage.Drafts) {
    logger.debug('current page is system', { ctrlKey, path: route.path });
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
    logger.verbose('current page link is booking page, detecting offer kind', { ctrlKey, path: route.path });
    try {
      const bookingParam = route.params.id!.toString();
      const bookingId = bookingParam;
      const offerKind = await getBookingOfferKind(bookingId);
      result = offerKind === 'flights' ? AppPage.Flights : AppPage.Stays;
    } catch (err: any) {
      logger.warn('failed to obtain booking offer kind url', err, { ctrlKey, path: route.path });
      result = undefined;
    }
  }

  logger.debug('active page link obtained', { ctrlKey, page: result ?? 'none' });
  return result;
}

const activePageLink = ref<ActivePageLink | undefined>(undefined);

function isAnimated (): boolean {
  return !isPrefersReducedMotionEnabled();
}

function togglePageLinksMenu () {
  if (!toggling.value) {
    logger.debug('toggling navbar', { ctrlKey, collapsed: !collapsed.value });
    collapsed.value = !collapsed.value;
    toggling.value = isAnimated() && true;
  } else {
    logger.verbose('wont toggle navbar, it is currently toggling', ctrlKey);
  }
}

function onPageLinksToggled () {
  logger.debug('page links toggled', { ctrlKey, collapsed: collapsed.value });
  toggling.value = false;
  updateTabIndices();
}

function onLinkClicked () {
  if (!toggling.value && !collapsed.value) {
    logger.verbose('locale changed, collapsing', ctrlKey);
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
    logger.debug('ESC pressed, collapsing', ctrlKey);
    togglePageLinksMenu();
  }
}

onMounted(async () => {
  watch(() => route.path, () => {
    logger.debug('route changed, updating active page link', { ctrlKey, route: route.path });
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
      :ctrl-key="[...ctrlKey, 'SearchPageLinks']"
      :mode="mode"
      :collapsed="collapsed"
      :toggling="toggling"
      :active-page-link="activePageLink"
      :hard-links="hardLinks"
      @toggled="onPageLinksToggled"
      @link-clicked="onLinkClicked"
    />
    <NavLogo :ctrl-key="[...ctrlKey, 'NavLink', 'NavLogo']" :mode="mode" :hard-link="hardLinks"/>
    <div class="nav-toggler-div mt-xs-2 mt-l-0">
      <button class="nav-toggler ml-xs-1 mb-xs-2 brdr-1" type="button" role="switch" :aria-checked="collapsed" @click="togglePageLinksMenu">
&nbsp;
      </button>
    </div>
    <div class="nav-controlbox mt-xs-2 mt-s-0">
      <div v-if="!isErrorPage" class="nav-page-settings">
        <ClientOnly>
          <div v-if="userAccountStore.isAuthenticated" class="nav-user-favourites-div">
            <NavLink
              :ctrl-key="[...ctrlKey, 'NavLink', 'Favourites']"
              link-class="nav-user-favourites mr-l-3"
              :to="navLinkBuilder.buildPageLink(AppPage.Favourites, locale as Locale)"
              :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')"
              :is-active="activePageLink === AppPage.Favourites"
              :hard-link="hardLinks"
              icon="favourite"
            />
          </div>
        </ClientOnly>
        <LocaleSwitcher :ctrl-key="[...ctrlKey, 'Toggler', 'Locale']" />
        <ThemeSwitcher :ctrl-key="[...ctrlKey, 'Toggler', 'Theme']" />
        <ClientOnly>
          <LazyNavUser v-if="userAccountStore.isAuthenticated" :ctrl-key="[...ctrlKey, 'NavUser']" />
          <div v-else class="nav-login">
            <NavLink
              :id="`${toShortForm(ctrlKey)}-login-link`"
              :ctrl-key="[...ctrlKey, 'NavLink', 'Login']"
              link-class="ml-l-2"
              :hard-link="hardLinks"
              :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale, { originPath: formatAuthCallbackUrl(withQuery(route.path, route.query), enabled)})"
              :text-res-name="getI18nResName2('nav', 'login')"
            />
            <NavLink
              link-class="btn nav-signup-btn"
              :ctrl-key="[...ctrlKey, 'NavLink', 'SignUp']"
              :hard-link="hardLinks"
              :to="navLinkBuilder.buildPageLink(AppPage.Signup, locale as Locale)"
              :text-res-name="getI18nResName2('nav', 'signUp')"
            />
          </div>
        </ClientOnly>
      </div>
    </div>
  </nav>
</template>
