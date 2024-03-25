<script setup lang="ts">
import { getI18nResName2 } from './../../shared/i18n';
import { type NavBarMode } from './../../shared/interfaces';
import ThemeSwitcher from './../../components/navbar/theme-switcher.vue';
import LocaleSwitcher from './../../components/navbar/locale-switcher.vue';
import { PagePath } from './../../shared/constants';

interface IProps {
  ctrlKey: string,
  mode: NavBarMode,
  collapsed?: boolean,
  toggling?: boolean
}

const logger = CommonServicesLocator.getLogger();

const localePath = useLocalePath();
const props = withDefaults(defineProps<IProps>(), {
  collapsed: false,
  toggling: false
});

const $emit = defineEmits(['toggling', 'toggled', 'linkClicked']);

function getClassName (collapsed: boolean, toggling: boolean) {
  return `${(collapsed ? 'collapsed' : 'expanded')} ${(toggling ? 'toggling' : '')}`;
}

function onAnimationStart () {
  logger.debug(`(NavSearchPageLink) animation started, ctrlKey=${props.ctrlKey}`);
  $emit('toggling');
}

function onAnimationEnd () {
  logger.debug(`(NavSearchPageLink) animation ended, ctrlKey=${props.ctrlKey}`);
  $emit('toggled');
}

function onLinkClicked () {
  logger.debug(`(NavSearchPageLink) link clicked, ctrlKey=${props.ctrlKey}`);
  $emit('linkClicked');
}

const isErrorPage = useError().value;

</script>

<template>
  <div
    class="nav-search-page-links mt-xs-2 mt-l-0"
    :class="getClassName(collapsed, toggling)"
    @animationstart="onAnimationStart"
    @animationend="onAnimationEnd"
  >
    <div v-if="!isErrorPage" class="nav-page-settings mb-xs-1 mt-xs-1">
      <LocaleSwitcher ctrl-key="navPageSettingsLocaleSwitcher" @changed="onLinkClicked" />
      <ThemeSwitcher ctrl-key="navPageSettingsThemeSwitcher" />
    </div>
    <NavLink
      ctrl-key="navLinkFlights"
      :to="localePath(`/${PagePath.Flights}`)"
      :text-res-name="getI18nResName2('nav', 'findFlights')"
      :mode="mode"
      icon="airplane"
      @click="onLinkClicked"
    />
    <NavLink
      ctrl-key="navLinkStays"
      :to="localePath(`/${PagePath.Stays}`)"
      class="ml-l-3"
      :text-res-name="getI18nResName2('nav', 'findStays')"
      :mode="mode"
      icon="bed"
      @click="onLinkClicked"
    />
  </div>
</template>
