<template>
    <h1 :id="id" class="text-4xl font-semibold w-fit max-w-[90vw] break-words text-black dark:text-white mb-10">
      <a
        v-if="generate"
        :href="`#${id}`"
      >
        <slot />
      </a>
      <slot v-else />
    </h1>
  </template>
  
  <script setup lang="ts">
  import { computed, useRuntimeConfig } from '#imports';
  
  const { id } = defineProps<{ id?: string }>();
  
  const { headings } = useRuntimeConfig().public.mdc;
  const generate = computed(() => id && ((typeof headings?.anchorLinks === 'boolean' && headings?.anchorLinks === true) || (typeof headings?.anchorLinks === 'object' && headings?.anchorLinks?.h1)));
  </script>