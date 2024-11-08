<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import { useThemeSettings } from './../../composables/theme-settings';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const themeSettings = useThemeSettings();


async function toggleTheme () {
  if (!import.meta.client) {
    return;
  }
  themeSettings.toggleTheme();
}

</script>

<template>
  <UButton
    role="switch"
    variant="ghost" 
    color="gray"
    size="sm" 
    square 
    class="*:w-5 *:h-5 *:sm:w-6 *:sm:h-6"
    :icon="`${themeSettings.currentTheme.value === 'light' ? 'i-heroicons-sun' : 'i-heroicons-moon'}`"
    :ui="{ icon: { base: 'bg-gray-900 dark:bg-gray-400' } }"
    :aria-label="$t(getI18nResName2('ariaLabels', 'btnThemeSwitcher'))"
    :aria-checked="themeSettings.currentTheme.value === 'light'"
    @click="toggleTheme"
  />
</template>
