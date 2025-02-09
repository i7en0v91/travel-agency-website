<script setup lang="ts">
import { ImageCategory, AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import { DeviceSizeEnum } from './../../helpers/constants';
import { formatImageEntityUrl , formatAvatarLabel, getUserMenuLinksInfo, getNavMenuLinksInfo, formatAuthCallbackUrl, getCurrentDeviceSize} from './../../helpers/dom';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import ThemeSwitcher from './theme-switcher.vue';
import LocaleSwitcher from './locale-switcher.vue';
import SiteSearchTool from './site-search-tool.vue';
import NavLogo from './nav-logo.vue';
import NavUser from './nav-user.vue';
import orderBy from 'lodash-es/orderBy';
import get from 'lodash-es/get';
import throttle from 'lodash-es/throttle';
import { withQuery } from 'ufo';

interface IProps {
  ctrlKey: string
}
const { ctrlKey } = defineProps<IProps>();

const themeSwitcher = useTemplateRef('theme-switcher');
const siteSearchTool = useTemplateRef('site-search');

const verticalNavCollapsed = ref(true);

const { status } = useAuth();
const { enabled } = usePreviewState();

const logger = getCommonServices().getLogger();
const route = useRoute();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const isErrorPage = useError();

const userAccountStore = useUserAccountStore();
userAccountStore.getUserAccount(); // start auth session refreshing in background

const vNavAvatarUrl = ref<string | undefined>(undefined);
const vNavAvatarLabel = ref<string | undefined>(undefined);
const navButtonsVisible = ref(false);

const onWindowResize = () => setTimeout(throttle(function () {
  if(!verticalNavCollapsed.value) {
    const deviceSize = getCurrentDeviceSize();
    switch(deviceSize) {
      case DeviceSizeEnum.XS:
      case DeviceSizeEnum.SM:
      case DeviceSizeEnum.MD:
        return;
    }

    logger.verbose(`(NavBar) window resized to ${deviceSize.valueOf()} size, collapsing vertical navbar, ctrlKey=${ctrlKey}`);
    verticalNavCollapsed.value = true;
  }
}), 100);

onMounted(async () => {
  window.addEventListener('resize', onWindowResize);
  navButtonsVisible.value = true;

  const userAccount = await userAccountStore.getUserAccount();
  watch(userAccount, () => {
    vNavAvatarUrl.value = userAccount.avatar ?   
        formatImageEntityUrl(userAccount.avatar, ImageCategory.UserAvatar, 1) : undefined;
    vNavAvatarLabel.value = formatAvatarLabel(userAccount.firstName, userAccount.lastName);
  }, { immediate: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});

defineShortcuts({
  escape: {
    usingInput: true,
    handler: () => {
      if(!verticalNavCollapsed.value) {
        logger.debug(`(NavBar) closing vertical nav by [ESC] press, ctrlKey=${ctrlKey}`);
        verticalNavCollapsed.value = true;
      }
    }
  }
});

function openSiteSearch () {
  setTimeout(() => {
    logger.debug('(NavBar) showing site search');
    siteSearchTool.value?.$el?.querySelector('button')?.click();
  }, 0);
}

function toggleVerticalNav () {
  setTimeout(() => {
    const deviceSize = getCurrentDeviceSize();
    switch(deviceSize) {
      case DeviceSizeEnum.XS:
      case DeviceSizeEnum.SM:
      case DeviceSizeEnum.MD:
        break;
      default:
        return;
    }

    logger.debug(`(NavBar) toggling vertical nav, ctrlKey=${ctrlKey}, new state collapsed=${!verticalNavCollapsed.value}`);
    verticalNavCollapsed.value = !verticalNavCollapsed.value;
  });
}

function themeSwitchClickHandler (e: InputEvent) {  
  const themeSwitcherEl = (themeSwitcher.value?.$el as HTMLElement);
  if(themeSwitcherEl) {
    if((e.target as HTMLElement)?.tagName?.toLowerCase() === 'button') {
      logger.debug(`(NavBar) passing click evt down to theme switcher, ctrlKey=${ctrlKey}, route=${route.path}`);
      themeSwitcherEl.click();
    }
  } else {
    logger.warn(`(NavBar) nested theme switcher not initialized, ctrlKey=${ctrlKey}, route=${route.path}`);
  }
}

const horizontalNavLinks = computed(() => {
  const authStatus = status?.value === undefined ? false : (status.value === 'authenticated' ? true : false);
  return getNavMenuLinksInfo(true).map(navGroup => navGroup
    .filter(li => 
      ((li.authStatus !== true && !authStatus) || ((li.authStatus === undefined || li.authStatus) && authStatus)) &&
      (!isErrorPage.value || li.showOnErrorPage)
    )
    .map(li => {
      return {
        kind: li.kind,
        label: li.labelResName ? t(li.labelResName) : '',
        labelClass: `focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400`,
        icon: li.icon,
        iconClass: li.iconClass,
        click: li.kind === 'theme-switcher' ? themeSwitchClickHandler : 
              (li.kind === 'nav-user' ? toggleVerticalNav : undefined),
        to: li.kind === 'login' ? navLinkBuilder.buildPageLink(
          AppPage.Login, 
          locale.value as Locale, 
          { originPath: formatAuthCallbackUrl(withQuery(route.path, route.query), enabled) }
        ) : (li.kind === 'signup' ? navLinkBuilder.buildPageLink(
            AppPage.Signup, 
            locale.value as Locale
          ) : (li.toPage ? navLinkBuilder.buildPageLink(
            li.toPage, 
            locale.value as Locale
          ) : undefined)
        ),
        external: false
      };
    })
  );
});

const verticalNavLinks = computed(() => {
  const authStatus = status?.value === undefined ? false : (status.value === 'authenticated' ? true : false);
  const navMenuLinks = getNavMenuLinksInfo(false).map(navGroup => 
    orderBy(
      navGroup.filter(li => li.verticalNav && (li.authStatus === undefined || li.authStatus === authStatus)), 
      ['verticalNav'], ['asc']
    ).map(li => {
      return {
        kind: li.kind,
        label: li.labelResName ? t(li.labelResName) : '',
        labelClass: 'focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400',
        icon: li.icon,
        iconClass: li.iconClass,
        to: li.kind === 'login' ? navLinkBuilder.buildPageLink(
          AppPage.Login, 
          locale.value as Locale, 
          { originPath: formatAuthCallbackUrl(withQuery(route.path, route.query), enabled) }
        ) : (li.kind === 'signup' ? navLinkBuilder.buildPageLink(
            AppPage.Signup, 
            locale.value as Locale
          ) : (li.toPage ? navLinkBuilder.buildPageLink(
            li.toPage, 
            locale.value as Locale
          ) : undefined)
        ),
        external: li.kind !== 'site-search' ? false : undefined,
        click: li.kind === 'site-search' ? (() => {
          openSiteSearch();
          toggleVerticalNav();
        }) : toggleVerticalNav
      };
    })
  ).filter(group => group.length);
  if(!authStatus || isErrorPage.value) {
    return navMenuLinks;
  }

  const userMenuLinks = getUserMenuLinksInfo().map(linkGroup => {
    return linkGroup.map(li => {
      return li.kind === 'avatar' ? (
        vNavAvatarUrl.value ? {
            kind: li.kind,
            label: vNavAvatarLabel.value ?? '',
            labelClass: 'text-nowrap',
            avatar: {
              src: vNavAvatarUrl.value
            },
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale),
            click: toggleVerticalNav,
            external: false
          } : {
            kind: li.kind,
            label: vNavAvatarLabel.value ?? '',
            labelClass: 'text-nowrap',
            icon: 'i-heroicons-user-20-solid',
            iconClass: 'w-[32px] h-[32px] sm:w-[48px] sm:h-[48px]',
            to: navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale),
            click: toggleVerticalNav,
            external: false
          }
      ) : {
        kind: li.kind,
        label: li.labelResName ? t(li.labelResName) : '',
        labelClass: 'focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400',
        icon: li.icon,
        //iconClass: li.iconClass,
        click: async () => {
          const menuActionHandler = get(navLinkBuilder.menuItemHandlers, li.kind);
          try {
            if(menuActionHandler) {
              await menuActionHandler();
            }
          } finally {
            toggleVerticalNav();
          }
        },
        to: li.kind === 'login' ? navLinkBuilder.buildPageLink(
          AppPage.Login, 
          locale.value as Locale, 
          { originPath: formatAuthCallbackUrl(withQuery(route.path, route.query), enabled) }
        ) : (li.toPage ? navLinkBuilder.buildPageLink(
          li.toPage, 
          locale.value as Locale
        ) : undefined),
        external: false
      };
    });
  });
  const avatarGroup = userMenuLinks[0][0].kind === 'avatar' ? userMenuLinks.shift() : undefined;

  return [ avatarGroup ?? [], ...navMenuLinks, ...userMenuLinks];
});

const uiStyling = computed(() => {
  return {
    base: `lg:hidden p-0 z-10 ${navButtonsVisible.value ? 'visible' : 'invisible'}`
  };
});

</script>

<template>
  <!-- class selectors for horizontal layout: 
    1. remove ring highlight from logo link
    2. hide hamburger toggler for >= large layouts
    3. hide search page links & site search for mobile layouts
    4. show favourites links only for XL devices
    5. hide Login & SignUp links for XS devices
    TODO: check moving into :ui props of UHorizontalNavigation
    -->
  <UHorizontalNavigation
    id="nav-main-h" 
    :links="horizontalNavLinks" 
    :aria-label="$t(getI18nResName2('ariaLabels', 'navMain'))"
    :class="`min-h-16 shadow-md dark:shadow-gray-700 sticky top-0 z-navbar bg-white dark:bg-gray-900 px-[14px] lg:px-[24px] xl:px-[64px]

      lg:[&_ul:first-of-type_li:first-of-type_button]:absolute
      lg:[&_ul:first-of-type_li:first-of-type_button]:w-0
      focus-visible:[&_ul:first-of-type_li:first-of-type_button]:ring-0
      
      lg:[&_ul:first-of-type_li:nth-child(2)]:hidden

      [&_ul:first-of-type_li:nth-of-type(3)]:hidden
      lg:[&_ul:first-of-type_li:nth-of-type(3)]:list-item
      [&_ul:first-of-type_li:nth-of-type(4)]:hidden
      lg:[&_ul:first-of-type_li:nth-of-type(4)]:list-item
      [&_ul:first-of-type_li:last-of-type]:hidden
      lg:[&_ul:first-of-type_li:last-of-type]:list-item

      [&_ul:last-of-type_li:first-of-type:has(.favourites-link)]:hidden 
      2xl:[&_ul:last-of-type_li:first-of-type:has(.favourites-link)]:list-item

      [&_ul:last-of-type_li:has(.auth-link)]:hidden 
      sm:[&_ul:last-of-type_li:has(.auth-link)]:list-item
`"
  >   
    <!-- KB: z-10 used below are to capture click event & fix label dissapearing when hovered in light theme  -->
    <template #default="{ link }">
      <NavLogo v-if="link.kind === 'nav-logo'" ctrl-key="navLogo" class="lg:absolute lg:translate-x-[50vw] lg:left-[-4.37rem] xl:left-[-6.87rem] translate-y-1 lg:-translate-y-1/3"/>
      <ClientOnly v-else-if="link.kind === 'nav-toggler'" >
        <UButton size="md" :ui="uiStyling" :icon="`${verticalNavCollapsed ? 'cil-hamburger-menu' : 'i-ph-x'}`" variant="link" color="gray" @click="toggleVerticalNav"/>
      </ClientOnly>
      <ClientOnly v-else-if="link.kind === 'locale-switcher' && navButtonsVisible">
        <LocaleSwitcher ctrl-key="navLocaleSwitcher" />
      </ClientOnly>
      <ClientOnly v-else-if="link.kind === 'theme-switcher'">
        <ThemeSwitcher ref="theme-switcher" ctrl-key="navThemeSwitcher" :class="`${navButtonsVisible ? 'visible' : 'invisible'}`" />
      </ClientOnly>
      <ClientOnly v-else-if="link.kind === 'site-search'">
        <SiteSearchTool ref="site-search" :class="`${navButtonsVisible ? 'visible' : 'invisible'}`" />
      </ClientOnly>
      <NavUser v-else-if="link.kind === 'nav-user' && navButtonsVisible" ctrl-key="navUser" @vertical-nav-toggled="toggleVerticalNav"/>
      <span v-else :class="`text-sm sm:text-base text-nowrap z-10 ${link.kind === 'signup' ? 'auth-link bg-black text-white hover:bg-white-100/80 dark:bg-white dark:text-black dark:hover:bg-gray-100/80 rounded-lg px-3.5 py-2 sm:py-3.5 font-semibold' : (link.kind === 'login' ? 'auth-link' : (link.kind === 'favourites' ? 'favourites-link' : 'search-page-link'))}`" >{{ link.label }}</span>
    </template>
  </UHorizontalNavigation>
  <UContainer class="pt-4">
    <div v-if="verticalNavCollapsed" class="absolute w-full max-w-[inherit] top-0 bottom-0 bg-primary-300 dark:bg-gray-800" />
    <div :class="!verticalNavCollapsed ? `absolute z-[-1] hidden` : 'contents'">
      <slot />
    </div>
    <UVerticalNavigation v-if="!verticalNavCollapsed" id="nav-main-v" :links="verticalNavLinks" class="mt-2 relative z-[1]" :aria-label="$t(getI18nResName2('ariaLabels', 'navMain'))"/>   
  </UContainer>
</template>
