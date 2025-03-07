<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName1 } from '@golobe-demo/shared';
import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../helpers/constants';

interface IProps {
  ctrlKey: ControlKey,
  sectionKey: string,
  labelResName: string
}
const { sectionKey, labelResName } = defineProps<IProps>();

const { t } = useI18n();
const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');

const $emit = defineEmits(['click']);

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

const tooltipId = useId();

</script>

<template>
  <li class="footer-item" @click="$emit('click')" @keyup.space="$emit('click')" @keyup.enter="$emit('click')">
    <VTooltip
      ref="tooltip"
      :aria-id="tooltipId"
      :distance="6"
      :triggers="['click']"
      placement="bottom"
      :flip="false"
      theme="footer-item-tooltip"
      :auto-hide="true"
      no-auto-focus
      @apply-show="scheduleTooltipAutoHide"
    >
      <button ref="link-btn" :class="`footer-item-ctrl tabbable tabbable-group-${sectionKey} brdr-1`">
        {{ t(labelResName) }}
      </button>
      <template #popper>
        <div class="footer-item-tooltip">
          {{ t(getI18nResName1('notAvailableInDemo')) }}
        </div>
      </template>
    </VTooltip>
  </li>
</template>
