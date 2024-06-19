<script setup lang="ts">
import { getI18nResName2 } from './../../shared/i18n';
import { type ActivePageLink, type NavBarMode } from './../../shared/interfaces';
import ThemeSwitcher from './../../components/navbar/theme-switcher.vue';
import LocaleSwitcher from './../../components/navbar/locale-switcher.vue';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';

interface IProps {
  ctrlKey: string,
  mode: NavBarMode,
  collapsed?: boolean,
  toggling?: boolean,
  activePageLink?: ActivePageLink
}

const logger = CommonServicesLocator.getLogger();

const localePath = useLocalePath();
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
        :to="localePath(`/${getHtmlPagePath(HtmlPage.Flights)}`)"
        :text-res-name="getI18nResName2('nav', 'findFlights')"
        icon="airplane"
        :is-active="activePageLink === HtmlPage.Flights"
        @click="onLinkClicked"
      />
      <NavLink
        ctrl-key="navLinkStays"
        :to="localePath(`/${getHtmlPagePath(HtmlPage.Stays)}`)"
        :text-res-name="getI18nResName2('nav', 'findStays')"
        icon="bed"
        :is-active="activePageLink === HtmlPage.Stays"
        @click="onLinkClicked"
      />
    </div>
  </Transition>
</template>
