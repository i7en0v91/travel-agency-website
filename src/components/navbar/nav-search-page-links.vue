<script setup lang="ts">
import { getI18nResName2 } from './../../shared/i18n';
import { type NavBarMode } from './../../shared/interfaces';
import ThemeSwitcher from './../../components/navbar/theme-switcher.vue';
import LocaleSwitcher from './../../components/navbar/locale-switcher.vue';

interface IProps {
  ctrlKey: string,
  mode: NavBarMode,
  collapsed?: boolean,
  toggling?: boolean
}

const localePath = useLocalePath();
withDefaults(defineProps<IProps>(), {
  collapsed: false,
  toggling: false
});

const $emit = defineEmits(['toggling', 'toggled', 'localeChanged']);

function getClassName (collapsed: boolean, toggling: boolean) {
  return `${(collapsed ? 'collapsed' : 'expanded')} ${(toggling ? 'toggling' : '')}`;
}

function onLocaleChanged () {
  $emit('localeChanged');
}

const isErrorPage = useError().value;

</script>

<template>
  <div
    class="nav-search-page-links mt-xs-2 mt-l-0"
    :class="getClassName(collapsed, toggling)"
    @animationstart="$emit('toggling')"
    @animationend="$emit('toggled')"
  >
    <div v-if="!isErrorPage" class="nav-page-settings mb-xs-1 mt-xs-1">
      <LocaleSwitcher ctrl-key="navPageSettingsLocaleSwitcher" @changed="onLocaleChanged" />
      <ThemeSwitcher ctrl-key="navPageSettingsThemeSwitcher" />
    </div>
    <NavLink ctrl-key="navLinkFlights" :to="localePath('/flights')" :text-res-name="getI18nResName2('nav', 'findFlights')" :mode="mode" icon="airplane" />
    <NavLink
      ctrl-key="navLinkStays"
      :to="localePath('/stays')"
      class="ml-l-3"
      :text-res-name="getI18nResName2('nav', 'findStays')"
      :mode="mode"
      icon="bed"
    />
  </div>
</template>
