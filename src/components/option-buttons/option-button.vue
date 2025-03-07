<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { IOptionButtonProps } from './../../types';

const { 
  ctrlKey, 
  shortIcon, 
  isActive = false, 
  subtextResName = null, 
  subtextResArgs = null 
} = defineProps<IOptionButtonProps>();

const $emit = defineEmits<{(event: 'click', ctrlKey: ControlKey): void}>();

function onActivate () {
  $emit('click', ctrlKey);
}

const htmlLabelId = useId();
const htmlId = useId();

</script>

<template>
  <div
    :id="htmlId"
    :class="`option-button tabbable ${isActive ? 'active' : ''} ${enabled ? 'enabled' : 'disabled'}`"
    :role="role.role"
    :aria-checked="role.role === 'radio' ? isActive : undefined"
    :aria-labelledby="htmlLabelId"
    :aria-controls="role.role === 'tab' ? (role as any).tabPanelId : undefined"
    :aria-selected="role.role === 'tab' ? isActive : undefined"
    :data-tab-name="tabName"
    @click="onActivate"
    @keyup.enter="onActivate"
  >
    <div class="option-button-separator" role="separator" />
    <div class="option-button-div px-xs-2 py-xs-2 py-s-3">
      <div v-if="shortIcon" :class="`option-button-icon mr-xs-2 option-button-icon-${shortIcon}`" />
      <div class="option-button-text">
        <div :id="htmlLabelId" class="option-button-label">
          {{ $t(labelResName) }}
        </div>
        <div v-if="subtextResName" class="option-button-subtext mt-xs-2">
          {{ $t(subtextResName, subtextResArgs) }}
        </div>
        <div v-else-if="subtextResName === undefined" class="text-data-loading data-loading-stub mt-xs-2" />
      </div>
    </div>
  </div>
</template>
