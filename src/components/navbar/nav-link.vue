<script setup lang="ts">
import type { Locale, I18nResName } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

interface IProps {
  ctrlKey: string,
  to: string,
  textResName: I18nResName,
  icon?: string,
  linkClass?: string,
  isActive?: boolean
}
const { ctrlKey, linkClass, icon, isActive = false } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

function getClass (): string {
  if (!icon) {
    return `nav-link brdr-1 ${linkClass ?? ''}`;
  }
  return `nav-link nav-link-icon nav-icon-common nav-link-icon-${icon} brdr-1  ${linkClass ?? ''}`;
}

function onClick () {
  logger.debug(`(NavLink) on click, ctrlKey=${ctrlKey}`);
  $emit('click');
}

const $emit = defineEmits(['click']);

</script>

<template>
  <div :class="`nav-page-link-cell ${isActive ? 'active' : ''}`">
    <div class="nav-item nav-page-link mx-l-2 my-xs-2 py-l-2 my-l-0">
      <NuxtLink :class="getClass()" :to="navLinkBuilder.buildLink(to, locale as Locale)" @click="onClick">
        {{ $t(textResName) }}
      </NuxtLink>
    </div>
  </div>
</template>
