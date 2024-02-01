<script setup lang="ts">

import { Dropdown } from 'floating-vue';
import { ImageCategory } from './../../shared/interfaces';
import StaticImage from './../images/static-image.vue';
import { getI18nResName3 } from './../../shared/i18n';
import { clampTextLine } from './../../shared/common';
import { updateTabIndices } from './../../shared/dom';
import NavUserMenuItem from './nav-user-menu-item.vue';
import { useUserAccountStore } from './../../stores/user-account-store';
import { TabIndicesUpdateDefaultTimeout } from './../../shared/constants';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const { status, signOut } = useAuth();
const localePath = useLocalePath();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const dropdown = ref<InstanceType<typeof Dropdown>>();

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

</script>

<template>
  <div v-if="status === 'authenticated'" class="nav-item nav-user mt-m-1" @keyup.escape="hideDropdown">
    <VDropdown
      ref="dropdown"
      :distance="6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom"
      :flip="false"
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
        img-class="nav-user-avatar-img"
        :entity-src="{ slug: userAccount.avatar.slug, timestamp: userAccount.avatar.timestamp }"
        :category="ImageCategory.UserAvatar"
        sizes="sm:30vw md:20vw lg:20vw xl:10vw xxl:10vw"
        :alt-res-name="getI18nResName3('nav', 'userBox', 'navAvatarAlt')"
      />
      <div v-else class="nav-user-avatar nav-user-avatar-default" />
      <button id="nav-user-menu-anchor" class="btn-user-name ml-xs-1 brdr-1" type="button">
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
              sizes="sm:30vw md:20vw lg:20vw xl:10vw xxl:10vw"
              :alt-res-name="getI18nResName3('nav', 'userBox', 'navAvatarAlt')"
            />
            <div v-else class="nav-user-menu-avatar nav-user-menu-avatar-default" />
            <h4 class="nav-user-menu-name">
              {{ clampTextLine(`${userAccount.firstName ?? '' } ${userAccount.lastName ? `${userAccount.lastName}.` : ''}`, 30) }}
            </h4>
          </div>
          <div class="nav-user-menu-list">
            <hr class="nav-user-menu-divisor mt-xs-1 mb-xs-1">
            <NavUserMenuItem ctrl-key="navUserMenuMyAccount" :text-res-name="getI18nResName3('nav', 'userBox', 'myAccount')" :to="localePath('/account')" icon="user" @click="() => { navigateTo(localePath('/account')); hideDropdown(); }" />
            <NavUserMenuItem ctrl-key="navUserMenuFavourites" :text-res-name="getI18nResName3('nav', 'userBox', 'favourites')" :to="localePath('/')" icon="heart" />
            <NavUserMenuItem ctrl-key="navUserMenuPayments" :text-res-name="getI18nResName3('nav', 'userBox', 'payments')" :to="localePath('/')" icon="credit-card" />
            <NavUserMenuItem ctrl-key="navUserMenuSettings" :text-res-name="getI18nResName3('nav', 'userBox', 'settings')" :to="localePath('/')" icon="gear" />
            <hr class="nav-user-menu-divisor mt-xs-3 mb-xs-2">
            <hr class="nav-user-menu-divisor mt-xs-3 mb-xs-1">
            <NavUserMenuItem ctrl-key="navUserMenuSupport" :text-res-name="getI18nResName3('nav', 'userBox', 'support')" :to="localePath('/')" icon="support" />
            <NavUserMenuItem ctrl-key="navUserMenuLogout" :text-res-name="getI18nResName3('nav', 'userBox', 'logout')" icon="logout" @click="() => { signOut(); hideDropdown(); }" />
          </div>
        </section>
      </template>
    </VDropdown>
  </div>
  <div v-else>
    <!-- nothing to show for unauthenticated user, it must be Login/Logout buttons -->
  </div>
</template>
