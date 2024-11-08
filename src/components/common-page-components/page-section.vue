<script setup lang="ts">
import { type I18nResName, getI18nResName1, type Locale } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  isError?: boolean,
  content?: {
    headerResName: I18nResName,
    subtextResName?: I18nResName,
    btnTextResName?: I18nResName,
    linkUrl?: string
  },
  contentPadded?: boolean,
};
withDefaults(defineProps<IProps>(), {
  contentPadded: true,
  content: undefined,
  isError: false
});

const tooltipShown = ref(false);

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltipShown.value = false; }, TooltipHideTimeout);
}

</script>

<template>
  <section class="block mt-10 sm:mt-20">
    <div v-if="content" class="w-full flex flex-col sm:flex-row flex-wrap sm:flex-nowrap justify-between gap-4 px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <div class="flex-grow flex-shrink basis-auto break-words text-gray-500 dark:text-gray-400">
        <h2 class="text-4xl font-semibold text-gray-600 dark:text-gray-300">
          {{ $t(content.headerResName) }}
        </h2>
        <p v-if="content.subtextResName" class="text-sm sm:text-base font-normal mt-4">
          {{ $t(content.subtextResName) }}
        </p>
      </div>
      <UButton v-if="content.linkUrl && content.btnTextResName" size="lg" class="flex-grow-0 flex-shrink-0 basis-auto self-end" variant="outline" color="primary" :to="navLinkBuilder.buildLink(content.linkUrl, locale as Locale)">
        <span class="text-gray-500 dark:text-gray-400">{{ $t(content.btnTextResName) }}</span>
      </UButton>
      <UPopover v-else-if="content.btnTextResName" v-model:open="tooltipShown" :popper="{ placement: 'bottom' }" class="flex-grow-0 flex-shrink-0 basis-auto self-end">
        <UButton size="lg" variant="outline" color="primary" @click="scheduleTooltipAutoHide">
          <span class="text-gray-500 dark:text-gray-400">{{ $t(content.btnTextResName) }}</span>
        </UButton>
        <template #panel="{ close }">
          <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
        </template>
      </UPopover>  
    </div>
    <div :class="`${content ? 'mt-6 sm:mt-10' : ''} ${contentPadded ? 'px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]' : ''}`">
      <ErrorHelm :is-error="isError ?? false">
        <slot />
      </ErrorHelm>
    </div>
  </section>
</template>
