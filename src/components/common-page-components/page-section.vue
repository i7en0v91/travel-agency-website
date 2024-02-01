<script setup lang="ts">

import { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { type I18nResName, getI18nResName1 } from './../../shared/i18n';
import SimpleButton from './../../components/forms/simple-button.vue';

interface IProps {
  ctrlKey: string,
  headerResName: I18nResName,
  subtextResName: I18nResName,
  linkUrl?: string,
  btnTextResName?: I18nResName,
  contentPadded?: boolean,
  isError?: boolean
};
const props = withDefaults(defineProps<IProps>(), {
  btnTextResName: undefined,
  contentPadded: true,
  linkUrl: undefined,
  isError: false
});

const tooltip = ref<InstanceType<typeof Tooltip>>();

const localePath = useLocalePath();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

</script>

<template>
  <section class="page-section">
    <div class="page-section-controls">
      <div class="page-section-texting">
        <h3>
          {{ $t(headerResName) }}
        </h3>
        <div class="page-section-subtext mt-xs-3" role="heading" aria-level="5">
          {{ $t(subtextResName) }}
        </div>
      </div>
      <NuxtLink v-if="linkUrl && btnTextResName" class="page-section-button btn btn-support brdr-1 tabbable" :to="localePath(linkUrl)">
        {{ $t(btnTextResName) }}
      </NuxtLink>
      <VTooltip
        v-else
        ref="tooltip"
        class="page-section-button-tooltip"
        :distance="6"
        :triggers="['click']"
        placement="bottom"
        :flip="false"
        theme="default-tooltip"
        :auto-hide="true"
        no-auto-focus
        @apply-show="scheduleTooltipAutoHide"
      >
        <SimpleButton :ctrl-key="`${props.ctrlKey}-Btn`" :label-res-name="btnTextResName" kind="support" class="page-section-button" />
        <template #popper>
          <div>
            {{ $t(getI18nResName1('notAvailableInDemo')) }}
          </div>
        </template>
      </VTooltip>
    </div>
    <div :class="`page-section-content ${contentPadded ? 'content-padded' : ''}`">
      <ErrorHelm class="page-section-error-helm" :is-error="isError ?? false">
        <slot />
      </ErrorHelm>
    </div>
  </section>
</template>
