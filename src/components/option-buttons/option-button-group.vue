<script setup lang="ts">
import { areCtrlKeysEqual, toShortForm, type ControlKey } from './../../helpers/components';
import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import type { IOptionButtonGroupProps } from './../../types';
import OptionButton from './option-button.vue';
import OtherOptionsButton from './other-options-button.vue';
import { getCommonServices } from '../../helpers/service-accessors';

const { 
  ctrlKey, 
  options, 
  otherOptions, 
  useAdaptiveButtonWidth = false,
  persistent = undefined,
  defaultActiveOptionKey = undefined
} = defineProps<IOptionButtonGroupProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'OptionButtonGroup' });
const controlValuesStore = useControlValuesStore();

const selectedOptionKey = defineModel<ControlKey | undefined>('activeOptionKey');
const DefaultOption = computed(() => { 
  if(!options?.length) {
    logger.error('option button group empty', undefined, { ctrlKey });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'option button group empty', 'error-stub');
  }

  if(defaultActiveOptionKey) {
    return defaultActiveOptionKey;
  }

  const firstEnabledOption = options.find(
    o => o.enabled === true && (
      !otherOptions?.ctrlKey || areCtrlKeysEqual(o.ctrlKey, otherOptions.ctrlKey) || 
      otherOptions!.variants.some(v => v.enabled)
    )
  );
  if (firstEnabledOption) {
    if (otherOptions?.ctrlKey && areCtrlKeysEqual(firstEnabledOption.ctrlKey, otherOptions.ctrlKey)) {
      const firstEnabledOtherOptionVariant = otherOptions!.variants.find(v => v.enabled === true)!;
      logger.debug('making other option variant as default', { ctrlKey, optionKey: firstEnabledOtherOptionVariant.ctrlKey });
      return firstEnabledOtherOptionVariant.ctrlKey;
    } else {
      logger.debug('making option as default', { ctrlKey, optionKey: firstEnabledOption.ctrlKey });
      return firstEnabledOption.ctrlKey;
    }
  } else {
    logger.verbose('all options are disabled, using first as default', {  ctrlKey });
    return options[0].ctrlKey;
  }
});

function onOptionButtonClick (optionKey: ControlKey) {
  logger.debug('received option button click event', { ctrlKey, optionKey });
  selectedOptionKey.value = optionKey;
}

const initialOverwrite = selectedOptionKey.value;
logger.debug('acquiring store value ref', { ctrlKey, defaultValue: DefaultOption.value, initialOverwrite });
const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<ControlKey>(ctrlKey, {
  initialOverwrite,
  defaultValue: DefaultOption.value,
  persistent
});

watch(storeValueRef, () => {
  logger.debug('store value watcher', { ctrlKey, modelValue: selectedOptionKey.value, storeValue: storeValueRef.value });
  const newValue: ControlKey = storeValueRef.value ?? DefaultOption.value;
  const changed = (!!newValue !== !!selectedOptionKey.value) || !areCtrlKeysEqual(newValue, selectedOptionKey.value!);
  if(changed) {
    selectedOptionKey.value = newValue;  
  }
}, { immediate: true });

watch(selectedOptionKey, () => {
  logger.debug('model value watcher', { ctrlKey, modelValue: selectedOptionKey.value, storeValue: storeValueRef.value });
  if(!storeValueRef.value || !areCtrlKeysEqual(selectedOptionKey.value!, storeValueRef.value)) {
    storeValueRef.value = selectedOptionKey.value ?? DefaultOption.value;
  }
}, { immediate: false });

</script>

<template>
  <section
    :class="`option-button-group ${useAdaptiveButtonWidth ? 'adaptive-buttons-width' : ''}`"
    :style="useAdaptiveButtonWidth ? {
      '--glb-option-button-group-size': ((otherOptions?.variants.length ?? 0) > 0 ? (options.length + 1) : options.length)
    } : undefined"
    :role="role"
  >
    <OptionButton
      v-for="o in options"
      :key="toShortForm(o.ctrlKey)"
      :ctrl-key="o.ctrlKey"
      :is-active="(selectedOptionKey && areCtrlKeysEqual(o.ctrlKey, selectedOptionKey)) ? true : false /* currentActiveOption && areCtrlKeysEqual(o.ctrlKey, currentActiveOption) ? true : false */"
      :label-res-name="o.labelResName"
      :short-icon="o.shortIcon"
      :subtext-res-name="o.subtextResName"
      :subtext-res-args="o.subtextResArgs"
      :enabled="o.enabled"
      :tab-name="o.tabName"
      :role="role === 'radiogroup' ? { role: 'radio' } : { role: 'tab', tabPanelId: (o.role as any).tabPanelId }"
      @click="() => onOptionButtonClick(o.ctrlKey)"
    />
    <OtherOptionsButton
      v-if="otherOptions"
      :ctrl-key="[...ctrlKey, 'OtherOptions']"
      :default-res-name="otherOptions!.defaultResName"
      :selected-res-name="otherOptions!.selectedResName"
      :subtext-res-name="otherOptions!.subtextResName"
      :subtext-res-args="otherOptions!.subtextResArgs"
      :variants="otherOptions!.variants.map(v => {
        return {
          ...v,
          isActive: selectedOptionKey && areCtrlKeysEqual(selectedOptionKey, v.ctrlKey)
        };
      })"
      :role="{ role: 'radio' }"
      :enabled="otherOptions!.enabled"
      @item-click="onOptionButtonClick"
    />
  </section>
</template>
