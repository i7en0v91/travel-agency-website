<script setup lang="ts">

import { type PropertyGridControlButtonType } from './../../../shared/interfaces';
import PropertyGridControlSection from './property-grid-control-section.vue';

interface IProps {
  ctrlKey: string,
  firstControlSectionButtons: PropertyGridControlButtonType[],
  lastControlSectionButtons: PropertyGridControlButtonType[]
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

function onControlButtonClick (button: PropertyGridControlButtonType) {
  logger.debug(`(ProperyGridRow) onControlButtonClick, ctrlKey=${props.ctrlKey}, button=${button}`);
  $emit('buttonClick', button);
}

const $emit = defineEmits<{(event: 'buttonClick', button: PropertyGridControlButtonType): void}>();

</script>

<template>
  <tr class="property-grid-row">
    <td class="property-grid-cell property-grid-main-cell">
      <div class="property-grid-value-slot">
        <slot name="value" />
      </div>
      <div class="property-grid-errors-slot mt-xs-2">
        <slot name="errors" />
      </div>
    </td>
    <td class="property-grid-cell property-grid-first-section">
      <PropertyGridControlSection :ctrl-key="`${props.ctrlKey}-firstControlSection`" :buttons="props.firstControlSectionButtons" @click="onControlButtonClick" />
    </td>
    <td class="property-grid-cell property-grid-last-section">
      <PropertyGridControlSection :ctrl-key="`${props.ctrlKey}-lastControlSection`" :buttons="props.lastControlSectionButtons" @click="onControlButtonClick" />
    </td>
  </tr>
</template>
