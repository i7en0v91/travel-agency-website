<script setup lang="ts">

import type { Dropdown } from 'floating-vue';
import { stringifyParsedURL, parseURL } from 'ufo';
import { ImageCategory } from './../../shared/interfaces';
import StaticImage from './../images/static-image.vue';
import { getI18nResName3 } from './../../shared/i18n';
import { clampTextLine, getLastSelectedOptionStorageKey } from './../../shared/common';
import { updateTabIndices } from './../../shared/dom';
import NavUserMenuItem from './nav-user-menu-item.vue';
import { UserAccountTabAccount, UserAccountTabPayments, UserAccountOptionButtonGroup, TabIndicesUpdateDefaultTimeout, PagePath, UserAccountOptionButtonPayments, UserAccountOptionButtonAccount } from './../../shared/constants';
import AppConfig from './../../appconfig';


interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const { signOut } = useAuth();
const localePath = useLocalePath();
const nuxtApp = useNuxtApp();

const logger = CommonServicesLocator.getLogger();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

async function getBookingPageSignOutUrl (): Promise<string> {
  logger.debug(`(NavUser) obtaining booking signout url: ctrlKey=${props.ctrlKey}`);
  try {
    const route = useRoute();

    const bookingParam = route.params.id!.toString();
    const bookingId = parseInt(bookingParam);
    const offerBookingStoreFactory = useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
    const offerBookingStore = await offerBookingStoreFactory.getUserBooking(bookingId, !!nuxtApp.ssrContext?.event.context.ogImageRequest, nuxtApp.ssrContext?.event);
    const offerId = offerBookingStore.offerId;
    const offerKind = offerBookingStore.offerKind;
    const urlPath = localePath(offerKind === 'flights' ? `/${PagePath.FlightDetails}/${offerId}` : `/${PagePath.StayDetails}/${offerId}`);

    const parsedRoute = parseURL(route.fullPath);
    parsedRoute.pathname = urlPath;
    const url = stringifyParsedURL(parsedRoute);
    logger.debug(`(NavUser) using booking signout url: ctrlKey=${props.ctrlKey}, bookingId=${bookingId}, url=${url}`);
    return url;
  } catch (err: any) {
    logger.warn(`(NavUser) failed to obtain booking signout url: ctrlKey=${props.ctrlKey}`, err);
    return localePath(`/${PagePath.Index}`);
  }
}

async function onSignOutClick (): Promise<void> {
  const route = useRoute();

  let callbackUrl = route.fullPath;
  if (callbackUrl.includes(PagePath.BookingDetails)) {
    callbackUrl = await getBookingPageSignOutUrl();
  }

  signOut({ callbackUrl, redirect: true });
  hideDropdown();
}

function onMenuItemClick () {
  setTimeout(hideDropdown, 0);
}

const isCurrentlyOnAccountPage = () => useRoute().path.includes(`/${PagePath.Account}`);

async function onPaymentsMenuItemClick (): Promise<void> {
  const onAccountPage = isCurrentlyOnAccountPage();
  logger.debug(`(NavUser) payments menu item clicked: ctrlKey=${props.ctrlKey}, isAccountPage=${onAccountPage}`);
  onMenuItemClick();

  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabPayments}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonPayments);
    await navigateTo(localePath(`/${PagePath.Account}`));
  }
}

async function onSettingsMenuItemClick (): Promise<void> {
  const onAccountPage = isCurrentlyOnAccountPage();
  logger.debug(`(NavUser) settings menu item clicked: ctrlKey=${props.ctrlKey}, isAccountPage=${onAccountPage}`);
  onMenuItemClick();

  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabAccount}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonAccount);
    await navigateTo(localePath(`/${PagePath.Account}`));
  }
}

</script>

<template>
  <div class="nav-item nav-user" @keyup.escape="hideDropdown">
    <VDropdown
      ref="dropdown"
      :distance="6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom"
      :flip="false"
      :no-auto-focus="true"
      :skidding="-100"
      theme="default-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <StaticImage
        v-if="userAccount.avatar"
        ctrl-key="navUserAvatar"
        :show-stub="false"
        class="nav-user-avatar"
        img-class="nav-user-avatar-img mb-xs-1"
        :entity-src="{ slug: userAccount.avatar.slug, timestamp: userAccount.avatar.timestamp }"
        :category="ImageCategory.UserAvatar"
        sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
        :alt-res-name="getI18nResName3('nav', 'userBox', 'navAvatarAlt')"
      />
      <span v-else class="nav-user-avatar nav-user-avatar-default" />
      <button id="nav-user-menu-anchor" class="btn-user-name brdr-1" type="button">
        {{ clampTextLine(`${userAccount.firstName ?? '' }`, 30) }} {{ (userAccount.lastName ? `${userAccount.lastName.substring(0, 1).toUpperCase()}.`: '') }}
      </button>
      <template #popper>
        <section class="nav-user-dropdown" data-popper-anchor="nav-user-menu-anchor" @keyup.escape="hideDropdown">
          <div class="nav-user-menu-header px-xs-5 pb-xs-3 pt-xs-2 py-s-4">
            <StaticImage
              v-if="userAccount.avatar"
              ctrl-key="navUserMenuAvatar"
              :show-stub="false"
              class="nav-user-menu-avatar"
              img-class="nav-user-menu-avatar-img"
              :entity-src="{ slug: userAccount.avatar.slug, timestamp: userAccount.avatar.timestamp }"
              :category="ImageCategory.UserAvatar"
              sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
              :alt-res-name="getI18nResName3('nav', 'userBox', 'navAvatarAlt')"
            />
            <div v-else class="nav-user-menu-avatar nav-user-menu-avatar-default" />
            <h4 class="nav-user-menu-name">
              {{ clampTextLine(`${userAccount.firstName ?? '' } ${userAccount.lastName ? `${userAccount.lastName}.` : ''}`, 30) }}
            </h4>
          </div>
          <div class="nav-user-menu-list">
            <div class="nav-user-menu-divisor mt-xs-1 mb-xs-1" role="separator"/>
            <NavUserMenuItem ctrl-key="navUserMenuMyAccount" :text-res-name="getI18nResName3('nav', 'userBox', 'myAccount')" :to="localePath(`/${PagePath.Account}`)" icon="user" @click="onMenuItemClick" />
            <NavUserMenuItem ctrl-key="navUserMenuFavourites" :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')" :to="localePath(`/${PagePath.Favourites}`)" icon="heart" @click="onMenuItemClick" />
            <NavUserMenuItem ctrl-key="navUserMenuPayments" :text-res-name="getI18nResName3('nav', 'userBox', 'payments')" icon="credit-card" @click="onPaymentsMenuItemClick" />
            <NavUserMenuItem ctrl-key="navUserMenuSettings" :text-res-name="getI18nResName3('nav', 'userBox', 'settings')" icon="gear" @click="onSettingsMenuItemClick" />
            <div class="nav-user-menu-divisor mt-xs-3 mb-xs-2" role="separator"/>
            <div class="nav-user-menu-divisor mt-xs-3 mb-xs-1" role="separator"/>
            <NavUserMenuItem ctrl-key="navUserMenuSupport" :text-res-name="getI18nResName3('nav', 'userBox', 'support')" :to="`mailto:${AppConfig.contactEmail}`" icon="support" @click="onMenuItemClick" />
            <NavUserMenuItem ctrl-key="navUserMenuLogout" :text-res-name="getI18nResName3('nav', 'userBox', 'logout')" icon="logout" @click="onSignOutClick" />
          </div>
        </section>
      </template>
    </VDropdown>
  </div>
</template>
