<script setup lang="ts">
import { type Locale, AppPage, getI18nResName3, ImageCategory } from '@golobe-demo/shared';
import { DeviceSizeEnum, LocatorClasses } from './../../helpers/constants';
import { formatImageEntityUrl, formatAvatarLabel, getUserMenuLinksInfo, getCurrentDeviceSize } from './../../helpers/dom';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';
import get from 'lodash-es/get';

interface IProps {
  ctrlKey: string
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const $emit = defineEmits(['verticalNavToggled']);

const userAvatarUrl = computed(() => {
  return userAccount.avatar ?   
    formatImageEntityUrl(userAccount.avatar, ImageCategory.UserAvatar, 1) :
    undefined;
});

const userMenuItems = computed(() => {
  return getUserMenuLinksInfo().map(
    group => group.map(li => {
      switch(li.kind) {
        case 'avatar':
          return userAvatarUrl.value ? {
            label: formatAvatarLabel(userAccount.firstName, userAccount.lastName),
            labelClass: 'text-nowrap ml-2',
            avatar: {
              src: userAvatarUrl.value,
              size: '2xl'
            },
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale)
          } : {
            label: formatAvatarLabel(userAccount.firstName, userAccount.lastName),
            labelClass: 'text-nowrap',
            icon: 'i-heroicons-user-20-solid',
            iconClass: 'w-16 h-16',
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale)
          };
        default:
          return {
            label: li.labelResName ? t(li.labelResName) : '',
            labelClass: li.labelResName ? 'w-full text-left after:scale-y-150 after:scale-x-75 after:content-[">"] after:float-right' : undefined,
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
  logger.debug(`(NavUser) user menu click handler: ctrlKey=${ctrlKey}, deviceSize=${deviceSize}`);

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
      :ui="{ rounded: 'rounded-full' }"
      @click.capture="onUserMenuClick"
    />
    <Icon v-else name="i-heroicons-user-20-solid" class="w-8 h-8" :alt="t(getI18nResName3('nav', 'userBox', 'navAvatarAlt'))" @click.capture="onUserMenuClick"/>
    <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }" :ui="{ container: `w-[320px] max-w-[320px] ${LocatorClasses.AuthUserMenuPopup}` }" class="*:hidden sm:*:block" @click.capture="onUserMenuClick">
      <UButton color="gray" variant="link" :class="`max-w-[200px] font-semibold text-primary-900 hover:text-primary-900 *:overflow-hidden *:text-ellipsis *:text-nowrap ${LocatorClasses.AuthUserMenu}`" :label="formatAvatarLabel(userAccount.firstName, userAccount.lastName)" />
    </UDropdown>
  </div>
</template>
