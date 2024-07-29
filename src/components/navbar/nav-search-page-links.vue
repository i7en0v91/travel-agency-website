<script setup lang="ts">
import { getI18nResName2 } from './../../shared/i18n';
import { type Locale } from './../../shared/constants';
import { type ActivePageLink, type NavBarMode } from './../../shared/interfaces';
import ThemeSwitcher from './../../components/navbar/theme-switcher.vue';
import LocaleSwitcher from './../../components/navbar/locale-switcher.vue';
import { AppPage } from './../../shared/page-query-params';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  mode: NavBarMode,
  collapsed?: boolean,
  toggling?: boolean,
  activePageLink?: ActivePageLink
}

const logger = CommonServicesLocator.getLogger();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const props = withDefaults(defineProps<IProps>(), {
  collapsed: false,
  toggling: false,
  activePageLink: undefined
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
  <Transition
    name="nav-page-links"
    @enter="onAnimationStart"
    @leave="onAnimationStart"
    @after-enter="onAnimationEnd"
    @after-leave="onAnimationEnd"
  >
    <div
      v-show="!collapsed"
      class="nav-search-page-links mt-xs-2 mt-l-0 pl-xs-2 pl-l-0"
      :class="getClassName(collapsed, toggling)"
    >
      <div v-if="!isErrorPage" class="nav-page-settings mb-xs-1 mt-xs-1">
        <LocaleSwitcher ctrl-key="navPageSettingsLocaleSwitcher" @changed="onLinkClicked" />
        <ThemeSwitcher ctrl-key="navPageSettingsThemeSwitcher" />
      </div>
      <NavLink
        ctrl-key="navLinkFlights"
        :to="navLinkBuilder.buildPageLink(AppPage.Flights, locale as Locale)"
        :text-res-name="getI18nResName2('nav', 'findFlights')"
        icon="airplane"
        :is-active="activePageLink === AppPage.Flights"
        @click="onLinkClicked"
      />
      <NavLink
        ctrl-key="navLinkStays"
        :to="navLinkBuilder.buildPageLink(AppPage.Stays, locale as Locale)"
        :text-res-name="getI18nResName2('nav', 'findStays')"
        icon="bed"
        :is-active="activePageLink === AppPage.Stays"
        @click="onLinkClicked"
      />
    </div>
  </Transition>
</template>
