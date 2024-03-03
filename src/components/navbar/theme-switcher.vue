<script setup lang="ts">

import { useThemeSettings } from './../../composables/theme-settings';
import { getI18nResName2 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const themeSettings = useThemeSettings();
const wasInteracted = ref(false);
async function toggleTheme () {
  if (!process.client) {
    return;
  }
  await themeSettings.toggleTheme();
  await nextTick(() => { wasInteracted.value = true; });
}

</script>

<template>
  <div :class="`nav-item theme-switcher pb-xs-1 ${wasInteracted ? 'interacted' : ''}`">
    <button
      type="button"
      role="switch"
      :aria-label="$t(getI18nResName2('ariaLabels', 'btnThemeSwitcher'))"
      class="theme-switcher-btn"
      :aria-checked="themeSettings.currentTheme.value === 'light'"
      @click="toggleTheme"
    />
  </div>
</template>
