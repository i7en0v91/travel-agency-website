<script setup lang="ts">
import { getI18nResName1, type Locale } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  btnLabel?: string,
  linkUrl?: string,
  padded?: boolean,
  spaced?: boolean,
  centered?: boolean
};
withDefaults(defineProps<IProps>(), {
  padded: true,
  spaced: true,
  centered: false,
  btnLabel: undefined,
  linkUrl: undefined
});

const tooltipShown = ref(false);

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const isError = ref(false);

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltipShown.value = false; }, TooltipHideTimeout);
}

</script>

<template>
  <section :class="`relative block ${spaced ? 'mt-10 sm:mt-20' : ''}`">
    <div class="w-full flex flex-col sm:flex-row flex-wrap justify-between gap-4 px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <div class="flex-1 break-words text-gray-500 dark:text-gray-400">
        <slot name="header"/>
        <slot name="subtext"/>
      </div>
      <UButton v-if="linkUrl && btnLabel" size="lg" class="flex-grow-0 flex-shrink-0 basis-auto self-end ml-auto" variant="outline" color="primary" :to="navLinkBuilder.buildLink(linkUrl, locale as Locale)" :external="false">
        <span class="text-gray-500 dark:text-gray-400">{{ btnLabel }}</span>
      </UButton>
      <UPopover v-else-if="btnLabel" v-model:open="tooltipShown" :popper="{ placement: 'bottom' }" class="flex-grow-0 flex-shrink-0 basis-auto self-end ml-auto">
        <UButton size="lg" variant="outline" color="primary" @click="scheduleTooltipAutoHide">
          <span class="text-gray-500 dark:text-gray-400">{{ btnLabel }}</span>
        </UButton>
        <template #panel="{ close }">
          <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
        </template>
      </UPopover>  
    </div>
    <div :class="`mt-6 sm:mt-10 ${padded ? 'px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]' : ''}`">
      <ErrorHelm v-model:is-error="isError">
        <slot />
      </ErrorHelm>
    </div>
  </section>
</template>
