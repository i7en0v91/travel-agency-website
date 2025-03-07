<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import type { ActivePageLink, NavBarMode } from './../../types';
import ThemeSwitcher from './../../components/navbar/theme-switcher.vue';
import LocaleSwitcher from './../../components/navbar/locale-switcher.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  mode: NavBarMode,
  collapsed?: boolean,
  toggling?: boolean,
  activePageLink?: ActivePageLink,
  hardLinks: boolean
}

const logger = getCommonServices().getLogger().addContextProps({ component: 'NavSearchPageLinks' });

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { ctrlKey, collapsed = false, toggling = false } = defineProps<IProps>();

const $emit = defineEmits(['toggling', 'toggled', 'linkClicked']);

function getClassName (collapsed: boolean, toggling: boolean) {
  return `${(collapsed ? 'collapsed' : 'expanded')} ${(toggling ? 'toggling' : '')}`;
}

function onAnimationStart () {
  logger.debug('animation started', ctrlKey);
  $emit('toggling');
}

function onAnimationEnd () {
  logger.debug('animation ended', ctrlKey);
  $emit('toggled');
}

function onLinkClicked () {
  logger.debug('link clicked', ctrlKey);
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
        <LocaleSwitcher :ctrl-key="[...ctrlKey, 'Toggler', 'Locale']" @changed="onLinkClicked" />
        <ThemeSwitcher :ctrl-key="[...ctrlKey, 'Toggler', 'Theme']" />
      </div>
      <NavLink
        :ctrl-key="[...ctrlKey, 'NavLink', 'Flights']"
        :to="navLinkBuilder.buildPageLink(AppPage.Flights, locale as Locale)"
        :hard-link="hardLinks"
        :text-res-name="getI18nResName2('nav', 'findFlights')"
        icon="airplane"
        :is-active="activePageLink === AppPage.Flights"
        @click="onLinkClicked"
      />
      <NavLink
        :ctrl-key="[...ctrlKey, 'NavLink', 'Stays']"
        :to="navLinkBuilder.buildPageLink(AppPage.Stays, locale as Locale)"
        :hard-link="hardLinks"
        :text-res-name="getI18nResName2('nav', 'findStays')"
        icon="bed"
        :is-active="activePageLink === AppPage.Stays"
        @click="onLinkClicked"
      />
    </div>
  </Transition>
</template>
