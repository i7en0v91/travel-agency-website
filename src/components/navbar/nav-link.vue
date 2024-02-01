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

function getClass (): string {
  if (!props.icon) {
    return `nav-link brdr-1 ${props.linkClass ?? ''}`;
  }
  return `nav-link nav-link-icon nav-icon-common nav-link-icon-${props.icon} brdr-1  ${props.linkClass ?? ''}`;
}

</script>

<template>
  <div class="nav-item nav-page-link mt-xs-2 mb-xs-2">
    <NuxtLink :class="getClass()" :to="localePath(to)">
      {{ $t(textResName) }}
    </NuxtLink>
  </div>
</template>
