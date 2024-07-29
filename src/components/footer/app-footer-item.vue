<script setup lang="ts">

import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { getI18nResName1 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  sectionKey: string,
  labelResName: string
}
const props = defineProps<IProps>();

const { t } = useI18n();

const elBtn = shallowRef<HTMLElement>();
const tooltip = shallowRef<InstanceType<typeof Tooltip>>();

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
      <button ref="elBtn" :class="`footer-item-ctrl tabbable tabbable-group-${props.sectionKey} brdr-1`">
        {{ t(props.labelResName) }}
      </button>
      <template #popper>
        <div class="footer-item-tooltip">
          {{ t(getI18nResName1('notAvailableInDemo')) }}
        </div>
      </template>
    </VTooltip>
  </li>
</template>
