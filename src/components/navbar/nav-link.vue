<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';
import { type NavBarMode } from './../../shared/interfaces';

const localePath = useLocalePath();

interface IProps {
  ctrlKey: string,
  to: string,
  textResName: I18nResName,
  mode: NavBarMode,
  icon?: string,
  linkClass?: string
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

function getClass (): string {
  if (!props.icon) {
    return `nav-link brdr-1 ${props.linkClass ?? ''}`;
  }
  return `nav-link nav-link-icon nav-icon-common nav-link-icon-${props.icon} brdr-1  ${props.linkClass ?? ''}`;
}

function onClick () {
  logger.debug(`(NavLink) on click, ctrlKey=${props.ctrlKey}`);
  $emit('click');
}

const $emit = defineEmits(['click']);

</script>

<template>
  <div class="nav-item nav-page-link my-xs-2 py-l-2 my-l-0">
    <NuxtLink :class="getClass()" :to="localePath(to)" @click="onClick">
      {{ $t(textResName) }}
    </NuxtLink>
  </div>
</template>
