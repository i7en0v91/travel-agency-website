<script setup lang="ts">
import { clampTextLine, type Locale, AppPage, getPagePath, AppConfig, getI18nResName3, ImageCategory } from '@golobe-demo/shared';
import { UserAccountTabAccount, UserAccountTabPayments, UserAccountOptionButtonGroup, UserAccountOptionButtonPayments, UserAccountOptionButtonAccount, DeviceSizeEnum } from './../../helpers/constants';
import { formatAvatarLabel, getUserMenuLinksInfo, getCurrentDeviceSize, updateTabIndices, TabIndicesUpdateDefaultTimeout, formatAuthCallbackUrl, getLastSelectedOptionStorageKey } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import { stringifyParsedURL, parseURL, stringifyQuery } from 'ufo';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { ApiEndpointImage } from './../../server/api-definitions';
import get from 'lodash-es/get';

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

const $emit = defineEmits(['verticalNavToggled']);

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

function onMenuItemClick () {
  setTimeout(hideDropdown, 0);
}

const userAvatarUrl = computed(() => {
  return userAccount.avatar ?   
    stringifyParsedURL({ 
      pathname: `/${ApiEndpointImage}`, 
      search: stringifyQuery({ 
        t: userAccount.avatar.timestamp,  
        slug: userAccount.avatar.slug, 
        category: ImageCategory.UserAvatar.valueOf()}) }) :
    undefined;
});

const userMenuItems = computed(() => {
  return getUserMenuLinksInfo().map(
    group => group.map(li => {
      switch(li.kind) {
        case 'avatar':
          return userAvatarUrl.value ? {
            label: formatAvatarLabel(userAccount.firstName, userAccount.lastName),
            labelClass: 'text-nowrap',
            avatar: {
              src: userAvatarUrl
            },
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale)
          } : {
            label: formatAvatarLabel(userAccount.firstName, userAccount.lastName),
            labelClass: 'text-nowrap',
            icon: 'i-heroicons-user-20-solid',
            iconClass: 'w-[64px] h-[64px]',
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale)
          };
        default:
          return {
            //kind: li.kind,
            label: li.labelResName ? t(li.labelResName) : undefined,
            labelClass: li.labelResName ? 'w-full text-left after:content-[">"] after:float-right' : undefined,
            icon: li.icon,
            click: get(navLinkBuilder.menuItemHandlers, li.kind),
            to: (li.toPage ? navLinkBuilder.buildPageLink(
              li.toPage, 
              locale.value as Locale
            ) : undefined)
          };
      }
    })
  );
});

function onUserMenuClick(e: InputEvent) {
  const deviceSize = getCurrentDeviceSize();
  logger.debug(`(NavUser) user menu click handler: ctrlKey=${props.ctrlKey}, deviceSize=${deviceSize}`);

  switch(deviceSize) {
    case DeviceSizeEnum.XS:
    case DeviceSizeEnum.SM:
    case DeviceSizeEnum.MD:
      e.preventDefault(); 
      e.stopPropagation(); 
      $emit('verticalNavToggled');
      break;
    default:
      // let event pass to dropdown control
  }
}

</script>

<template>
  <div class="relative flex flex-row items-center">
    <UAvatar 
      v-if="userAvatarUrl"
      :src="userAvatarUrl"
      :alt="t(getI18nResName3('nav', 'userBox', 'navAvatarAlt'))"
      class="w-[44px] h-[44px] rounded-full"
      @click.capture="onUserMenuClick"
    />
    <Icon v-else name="i-heroicons-user-20-solid" class="w-[44px] h-[44px]" :alt="t(getI18nResName3('nav', 'userBox', 'navAvatarAlt'))" @click.capture="onUserMenuClick"/>
    <!--<UButton color="gray" variant="link" class="hidden sm:block max-w-[200px] text-gray-900 hover:text-gray-900 *:overflow-hidden *:text-ellipsis *:text-nowrap" :label="`${clampTextLine(`${userAccount.firstName ?? '' }`, 30)} ${(userAccount.lastName ? `${userAccount.lastName.substring(0, 1).toUpperCase()}.`: '')}`" />-->
    <!--
    <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }" class="*:hidden sm:*:block">
    </UDropdown>
    -->    
    <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }" :ui="{ container: 'w-[320px] max-w-[320px]' }" class="*:hidden sm:*:block" @click.capture="onUserMenuClick">
      <UButton color="gray" variant="link" class="max-w-[200px] font-semibold text-gray-900 hover:text-gray-900 *:overflow-hidden *:text-ellipsis *:text-nowrap" :label="formatAvatarLabel(userAccount.firstName, userAccount.lastName)" />
    </UDropdown>
  </div>
</template>
