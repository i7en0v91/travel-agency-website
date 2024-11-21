<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';

interface ISortInfoProps {
  labelResName: I18nResName,
  icon: string,
  subtext?: {
    resName: I18nResName,
    resArgs: any
  } | undefined
}

defineProps<ISortInfoProps>();

</script>

<template>
  <ClientOnly>
    <div class="w-full p-2 sm:py-3 flex flex-row flex-nowrap gap-2 items-center justify-center sm:justify-start">
      <UIcon :name="icon" class="w-5 h-5 block sm:hidden"/>
      <div class="flex flex-col flex-nowrap items-center sm:items-start truncate">
        <div class="whitespace-nowrap font-semibold text-start">
          {{ $t(labelResName) }}
        </div>
        <div class="w-auto h-auto hidden sm:block">
          <div v-if="subtext" class="text-gray-400 dark:text-gray-500 mt-2 font-normal text-start">
            {{ $t(subtext.resName, subtext.resArgs) }}
          </div>
          <USkeleton v-else class="w-50 h-3 mt-2" />
        </div>
      </div>
    </div>
    <template #fallback>
      <div class="w-full flex flex-col flex-nowrap items-center sm:items-start">
        <USkeleton class="w-1/2 h-3" />
        <USkeleton class="w-3/4 h-3 mt-2" />
      </div>
    </template>
  </ClientOnly>
</template>
