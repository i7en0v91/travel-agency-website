<script setup lang="ts">
import { type IOptionButtonProps } from './../../shared/interfaces';

const props = withDefaults(defineProps<IOptionButtonProps>(), {
  isActive: false
});

const $emit = defineEmits<{(event: 'click', ctrlKey: string): void}>();

function onActivate () {
  $emit('click', props.ctrlKey);
}

</script>

<template>
  <li :class="`option-button tabbable ${isActive ? 'active' : ''} ${enabled ? 'enabled' : 'disabled'}`" @click="onActivate" @keyup.enter="onActivate">
    <div class="option-button-div px-xs-2">
      <div :class="`option-button-icon mr-xs-2 option-button-icon-${props.shortIcon}`" />
      <div class="option-button-text">
        <div class="option-button-label">
          {{ $t(labelResName) }}
        </div>
        <div v-if="subtextResName" class="option-button-subtext mt-xs-2">
          {{ $t(subtextResName, subtextResArgs) }}
        </div>
      </div>
    </div>
  </li>
</template>
