<script setup lang="ts">
import { clampTextLine, type Locale, AppPage, getPagePath, AppConfig, getI18nResName3, ImageCategory } from '@golobe-demo/shared';
import { UserAccountTabAccount, UserAccountTabPayments, UserAccountOptionButtonGroup, UserAccountOptionButtonPayments, UserAccountOptionButtonAccount } from './../../helpers/constants';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout, getLastSelectedOptionStorageKey } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import StaticImage from './../images/static-image.vue';
import NavUserMenuItem from './nav-user-menu-item.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';
import { useSignOut } from '../../composables/sign-out';

interface IProps {
  ctrlKey: string
}
const { ctrlKey } = defineProps<IProps>();

const signOutHelper = useSignOut();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const logger = getCommonServices().getLogger();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

async function onSignOutClick (): Promise<void> {
  await signOutHelper.signOut();
  hideDropdown();
}

function onMenuItemClick () {
  setTimeout(hideDropdown, 0);
}

const isCurrentlyOnAccountPage = () => useRoute().path.includes(`/${getPagePath(AppPage.Account)}`);

async function onPaymentsMenuItemClick (): Promise<void> {
  const onAccountPage = isCurrentlyOnAccountPage();
  logger.debug(`(NavUser) payments menu item clicked: ctrlKey=${ctrlKey}, isAccountPage=${onAccountPage}`);
  onMenuItemClick();

  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabPayments}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonPayments);
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale));
  }
}

async function onSettingsMenuItemClick (): Promise<void> {
  const onAccountPage = isCurrentlyOnAccountPage();
  logger.debug(`(NavUser) settings menu item clicked: ctrlKey=${ctrlKey}, isAccountPage=${onAccountPage}`);
  onMenuItemClick();

  if(onAccountPage) {
    (document.querySelector(`[data-tab-name="${UserAccountTabAccount}"]`) as HTMLElement)?.click();
  } else {
    // set payment tab to be automatically selected on mount
    const optionKey = getLastSelectedOptionStorageKey(UserAccountOptionButtonGroup);
    localStorage.setItem(optionKey, UserAccountOptionButtonAccount);
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale));
  }
}

</script>

<template>
  <div class="nav-item nav-user" @keyup.escape="hideDropdown">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
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
            <NavUserMenuItem ctrl-key="navUserMenuMyAccount" :text-res-name="getI18nResName3('nav', 'userBox', 'myAccount')" :to="navLinkBuilder.buildPageLink(AppPage.Account, locale as Locale)" icon="user" @click="onMenuItemClick" />
            <NavUserMenuItem ctrl-key="navUserMenuFavourites" :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')" :to="navLinkBuilder.buildPageLink(AppPage.Favourites, locale as Locale)" icon="heart" @click="onMenuItemClick" />
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
