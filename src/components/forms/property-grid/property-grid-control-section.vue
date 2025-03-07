<script setup lang="ts">
import { toShortForm, toKnownElement, type ControlKey } from './../../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';
import type { PropertyGridControlButtonType } from './../../../types';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  buttons: PropertyGridControlButtonType[]
}
const { ctrlKey } = defineProps<IProps>();

const ButtonIconTypeMap: { [P in PropertyGridControlButtonType]: string } = {
  'add': 'i-heroicons-plus-circle-20-solid',
  'apply': 'i-heroicons-check',
  'cancel': 'i-mdi-close',
  'change': 'i-heroicons-pencil',
  'delete': 'i-heroicons-trash'
};

const logger = getCommonServices().getLogger().addContextProps({ component: 'PropertyGridControlSection' });

function onControlButtonClick (button: PropertyGridControlButtonType) {
  logger.debug('onControlButtonClick', { ctrlKey, button });
  $emit('click', button);
}

const $emit = defineEmits<{(event: 'click', button: PropertyGridControlButtonType): void}>();

const uiStyling = {
  base: 'h-[3.5rem]',
  gap: {
    xl: 'gap-0 sm:gap-0 md:gap-x-2.5'
  },
  size: {
    xl: 'text-[0] sm:text-[0] md:text-base'
  },
  padding: {
    xl: 'px-4'
  }
};

</script>

<template>
  <div>
    <UButton v-for="b in buttons" :key="`${toShortForm(ctrlKey)}-${b}`" size="xl" variant="outline" color="primary" :ui="uiStyling" :icon="ButtonIconTypeMap[b]" @click="() => onControlButtonClick(b)">
      {{ $t(getI18nResName3('propertyGrid', 'controlButtons', b)) }}
    </UButton>
  </div>
</template>
