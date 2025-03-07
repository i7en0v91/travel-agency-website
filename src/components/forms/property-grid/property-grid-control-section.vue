<script setup lang="ts">
import { toShortForm, toKnownElement, type ControlKey } from './../../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';
import type { PropertyGridControlButtonType } from './../../../types';
import SimpleButton from './../../forms/simple-button.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  buttons: PropertyGridControlButtonType[]
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'PropertyGridControlSection' });

function onControlButtonClick (button: PropertyGridControlButtonType) {
  logger.debug('onControlButtonClick', { ctrlKey, button });
  $emit('click', button);
}

const $emit = defineEmits<{(event: 'click', button: PropertyGridControlButtonType): void}>();

</script>

<template>
  <div class="property-grid-control-section">
    <SimpleButton
      v-for="b in buttons"
      :key="`${toShortForm(ctrlKey)}-${b}`"
      :ctrl-key="[...ctrlKey, 'Btn', toKnownElement(b)]"
      :label-res-name="getI18nResName3('propertyGrid', 'controlButtons', b)"
      kind="support"
      class="property-grid-control-button"
      :icon="`propCtrl-${b}`"
      @click="() => onControlButtonClick(b)"
    />
  </div>
</template>
