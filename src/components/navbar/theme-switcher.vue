<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import { useThemeSettings } from './../../composables/theme-settings';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const themeSettings = useThemeSettings();
const wasInteracted = ref(false);
async function toggleTheme () {
  if (!import.meta.client) {
    return;
  }
  themeSettings.toggleTheme();
  await nextTick(() => { wasInteracted.value = true; });
}

</script>

<template>
  <div :class="`nav-item theme-switcher ${wasInteracted ? 'interacted' : ''}`">
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
