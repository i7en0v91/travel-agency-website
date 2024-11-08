<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import SiteSearch from './../site-search.vue';

const open = ref(false);

defineShortcuts({
  escape: {
    usingInput: true,
    whenever: [open],
    handler: () => { open.value = false; }
  },
  ctrl_k: {
    usingInput: true,
    handler: () => { open.value = !open.value; }
  }
});

const { t } = useI18n();

</script>

<template>
  <UTooltip :text="t(getI18nResName3('nav', 'search', 'navItem'))" :shortcuts="['Ctrl', 'K']">
    <UButton
      variant="ghost" 
      color="gray"
      size="sm" 
      square 
      class="*:w-5 *:h-5 *:sm:w-6 *:sm:h-6"
      icon="i-heroicons-magnifying-glass"
      :ui="{ icon: { base: 'bg-gray-900 dark:bg-gray-400' } }"
      :aria-label="$t(getI18nResName2('ariaLabels', 'btnSiteSearch'))"
      @click="nextTick(() => open = true)"
    />
    <UModal
      v-model="open" 
      :ui="{ 
        container: 'items-bottom sm:items-center md:items-center',
        width: 'w-[90vw] min-w-[300px] max-w-minpgw sm:max-w-lg lg:max-w-2xl',
        height: 'h-[60vh] max-h-[60vh] sm:h-[50vh] sm:max-h-[50vh]' 
      }">
      <SiteSearch 
        ctrl-key="siteSearch" 
        @close="open = false"/>
    </UModal>
  </UTooltip>
</template>
