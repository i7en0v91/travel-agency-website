<script setup lang="ts">
import { getCommonServices } from '../../../helpers/service-accessors';
import type { PropertyGridControlButtonType } from './../../../types';
import PropertyGridControlSection from './property-grid-control-section.vue';

interface IProps {
  ctrlKey: string,
  firstControlSectionButtons: PropertyGridControlButtonType[],
  lastControlSectionButtons: PropertyGridControlButtonType[]
}
const { ctrlKey, firstControlSectionButtons, lastControlSectionButtons } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

function onControlButtonClick (button: PropertyGridControlButtonType) {
  logger.debug(`(ProperyGridRow) onControlButtonClick, ctrlKey=${ctrlKey}, button=${button}`);
  $emit('buttonClick', button);
}

const $emit = defineEmits<{(event: 'buttonClick', button: PropertyGridControlButtonType): void}>();

</script>

<template>
  <tr class="property-grid-row">
    <td class="property-grid-row-td">
      <table class="property-grid-row-container">
        <tbody>
          <tr class="property-grid-row-input-ctrs">
            <td class="property-grid-cell property-grid-main-cell">
              <div class="property-grid-value-slot">
                <slot name="value" />
              </div>
            </td>
            <td class="property-grid-cell property-grid-first-section">
              <PropertyGridControlSection :ctrl-key="`${ctrlKey}-firstControlSection`" :buttons="firstControlSectionButtons" @click="onControlButtonClick" />
            </td>
            <td class="property-grid-cell property-grid-last-section">
              <PropertyGridControlSection :ctrl-key="`${ctrlKey}-lastControlSection`" :buttons="lastControlSectionButtons" @click="onControlButtonClick" />
            </td>
          </tr>
          <tr>
            <td>
              <div class="property-grid-errors-slot mt-xs-2">
                <slot name="errors" />
              </div>
            </td>
            <td>
              <div class="mt-xs-2" />
            </td>
            <td>
              <div class="mt-xs-2" />
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</template>
