<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type I18nResName, getI18nResName1, type Locale } from '@golobe-demo/shared';
import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../helpers/constants';
import SimpleButton from './../../components/forms/simple-button.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  headerResName: I18nResName,
  subtextResName?: I18nResName,
  linkUrl?: string,
  btnTextResName?: I18nResName,
  contentPadded?: boolean,
  isError?: boolean
};
const { ctrlKey, contentPadded = true, isError = false } = defineProps<IProps>();

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');
const tooltipId = useId();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

</script>

<template>
  <section class="page-section">
    <div class="page-section-controls">
      <div class="page-section-texting">
        <h2 class="font-h3">
          {{ $t(headerResName) }}
        </h2>
        <p v-if="subtextResName" class="page-section-subtext mt-xs-3">
          {{ $t(subtextResName) }}
        </p>
      </div>
      <NuxtLink v-if="linkUrl && btnTextResName" class="page-section-button btn btn-support brdr-1 tabbable" :to="navLinkBuilder.buildLink(linkUrl, locale as Locale)">
        {{ $t(btnTextResName) }}
      </NuxtLink>
      <VTooltip
        v-else-if="btnTextResName"
        ref="tooltip"
        :aria-id="tooltipId"
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
        <SimpleButton :ctrl-key="[...ctrlKey, 'Btn']" :label-res-name="btnTextResName" kind="support" class="page-section-button" />
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
