<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';

const localePath = useLocalePath();

interface IProps {
  ctrlKey: string,
  textResName: I18nResName,
  to?: string,
  icon: string,
  chevron?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  chevron: true,
  to: undefined
});

const $emit = defineEmits(['click']);

</script>

<template>
  <div class="nav-user-menu-item">
    <div :class="`nav-user-menu-icon mr-xs-2 nav-icon-common nav-link-icon-${props.icon}`" />
    <NuxtLink
      v-if="to"
      class="nav-link nav-user-menu-chevron brdr-1"
      :to="localePath(to)"
      @click="$emit('click')"
    >
      {{ $t(textResName) }}
    </NuxtLink>
    <button v-else class="nav-link nav-user-menu-chevron brdr-1" @click="$emit('click')">
      {{ $t(textResName) }}
    </button>
  </div>
</template>
