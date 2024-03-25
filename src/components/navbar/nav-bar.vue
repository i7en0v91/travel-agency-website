<script setup lang="ts">

import { updateTabIndices, isPrefersReducedMotionEnabled } from './../../shared/dom';
import { type NavBarMode } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';
import NavLink from './nav-link.vue';
import NavUser from './nav-user.vue';
import NavLogo from './nav-logo.vue';
import NavSearchPageLinks from './nav-search-page-links.vue';
import LocaleSwitcher from './locale-switcher.vue';
import ThemeSwitcher from './theme-switcher.vue';
import { PagePath } from './../../shared/constants';

const localePath = useLocalePath();
const { status } = useAuth();

interface IProps {
  ctrlKey: string,
  mode: NavBarMode
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const collapsed = ref(true);
const toggling = ref(false);

function isAnimated (): boolean {
  return !isPrefersReducedMotionEnabled();
}

function togglePageLinksMenu () {
  if (!toggling.value) {
    logger.debug(`(NavBar) toggling navbar, new state collapsed=${!collapsed.value}`);
    collapsed.value = !collapsed.value;
    toggling.value = isAnimated() && true;
  } else {
    logger.verbose('(NavBar) wont toggle navbar, it is currently toggling');
  }
}

function onPageLinksToggled () {
  logger.debug(`(NavBar) page links toggled, collapsed=${collapsed.value}`);
  toggling.value = false;
  updateTabIndices();
}

function onLinkClicked () {
  if (!toggling.value && !collapsed.value) {
    logger.verbose('(NavBar) locale changed, collapsing');
    toggling.value = isAnimated() && true;
    setTimeout(() => {
      collapsed.value = true;
    }, 0);
  }
}

const cssClass = computed(() => `nav-bar ${props.mode === 'inApp' ? 'nav-bar-inapp' : 'nav-bar-landing'}`);
const isErrorPage = useError().value;

</script>

<template>
  <nav :class="cssClass">
    <NavSearchPageLinks
      ctrl-key="navSearchPageLinks"
      :mode="mode"
      :collapsed="collapsed"
      :toggling="toggling"
      @toggled="onPageLinksToggled"
      @link-clicked="onLinkClicked"
    />
    <NavLogo ctrl-key="navLogo" :mode="mode" />
    <div class="nav-toggler-div mt-xs-2 mt-l-0">
      <button class="nav-toggler ml-xs-1 mb-xs-2 brdr-1" type="button" role="switch" :aria-checked="collapsed" @click="togglePageLinksMenu">
&nbsp;
      </button>
    </div>
    <div class="nav-controlbox mt-xs-2 mt-l-0">
      <div v-if="!isErrorPage" class="nav-page-settings">
        <LocaleSwitcher ctrl-key="navLocaleSwitcher" />
        <ThemeSwitcher ctrl-key="navThemeSwitcher" />
      </div>
      <NavUser v-if="status==='authenticated'" ctrl-key="navUser" />
      <div v-else class="nav-login">
        <NavLink
          :id="`${ctrlKey}-login-link`"
          ctrl-key="navLogin"
          :to="localePath(`/${PagePath.Login}`)"
          :text-res-name="getI18nResName2('nav', 'login')"
          :mode="mode"
        />
        <NavLink
          link-class="btn nav-signup-btn"
          ctrl-key="navSignUp"
          :to="localePath(`/${PagePath.Signup}`)"
          :text-res-name="getI18nResName2('nav', 'signUp')"
          :mode="mode"
        />
      </div>
    </div>
  </nav>
</template>
