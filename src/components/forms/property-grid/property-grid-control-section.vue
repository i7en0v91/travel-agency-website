<script setup lang="ts">

import { getI18nResName3 } from './../../../shared/i18n';
import { type PropertyGridControlButtonType } from './../../../shared/interfaces';
import SimpleButton from './../../forms/simple-button.vue';

interface IProps {
  ctrlKey: string,
  buttons: PropertyGridControlButtonType[]
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

function onControlButtonClick (button: PropertyGridControlButtonType) {
  logger.debug(`(ProperyGridControlSection) onControlButtonClick, ctrlKey=${props.ctrlKey}, button=${button}`);
  $emit('click', button);
}

const $emit = defineEmits<{(event: 'click', button: PropertyGridControlButtonType): void}>();

</script>

<template>
  <div class="property-grid-control-section">
    <SimpleButton
      v-for="b in buttons"
      :key="`${props.ctrlKey}-${b}`"
      :ctrl-key="`${props.ctrlKey}-${b}`"
      :label-res-name="getI18nResName3('propertyGrid', 'controlButtons', b)"
      kind="support"
      class="property-grid-control-button"
      :icon="`propCtrl-${b}`"
      @click="() => onControlButtonClick(b)"
    />
  </div>
</template>
