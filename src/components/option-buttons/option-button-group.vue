<script setup lang="ts">
import { type IOptionButtonGroupProps } from './../../shared/interfaces';
import { getLastSelectedOptionStorageKey } from './../../shared/common';
import OptionButton from './option-button.vue';
import OtherOptionsButton from './other-options-button.vue';

const props = withDefaults(defineProps<IOptionButtonGroupProps>(), {
  useAdaptiveButtonWidth: false
});

const $emit = defineEmits<{(event: 'update:activeOptionCtrl', newActiveOptionCtrlKey: string, prevActiveOptionCtrlKey?: string): void}>();

const logger = CommonServicesLocator.getLogger();

function saveLastSelectedOption (lastSelectOption?: string) {
  const storageKey = getLastSelectedOptionStorageKey(props.ctrlKey);
  if (lastSelectOption) {
    logger.debug(`(OptionButtonGroup) saving last active option: groupKey=${props.ctrlKey}, key=${storageKey}, option=${lastSelectOption ?? '[empty]'}`);
    localStorage.setItem(storageKey, lastSelectOption);
  } else {
    logger.debug(`(OptionButtonGroup) removing last active option: groupKey=${props.ctrlKey}, key=${storageKey}`);
    localStorage.removeItem(storageKey);
  }
}

function loadLastSelectedOption (): string | undefined {
  const storageKey = getLastSelectedOptionStorageKey(props.ctrlKey);
  logger.debug(`(OptionButtonGroup) loading last active option: groupKey=${props.ctrlKey}, key=${storageKey}`);
  const result = localStorage.getItem(storageKey) ?? undefined;
  logger.debug(`(OptionButtonGroup) last active option loaded: groupKey=${props.ctrlKey}, resuilt=${result}`);
  return result;
}

function fireActiveOptionChange (newActiveOptionKey: string) {
  const currentActiveOptionKey = props.activeOptionCtrl;
  if (!currentActiveOptionKey || currentActiveOptionKey !== newActiveOptionKey) {
    logger.debug(`(OptionButtonGroup) firing active option change: groupKey=${props.ctrlKey}, newActiveOption=${newActiveOptionKey}, prevActiveOption=${currentActiveOptionKey}`);
    $emit('update:activeOptionCtrl', newActiveOptionKey);
    saveLastSelectedOption(newActiveOptionKey);
  }
}

function onOptionButtonClick (ctrlKey: string) {
  logger.debug(`(OptionButtonGroup) received option button click event: groupKey=${props.ctrlKey}, ctrlKey=${ctrlKey}`);
  fireActiveOptionChange(ctrlKey);
}

function initActiveOption () {
  if (!props.activeOptionCtrl) {
    logger.debug(`(OptionButtonGroup) initializing active option: groupKey=${props.ctrlKey}`);
    const savedOption = loadLastSelectedOption();
    if (savedOption) {
      logger.debug(`(OptionButtonGroup) last selected option has been read from storage: groupKey=${props.ctrlKey}, option=${savedOption}`);
      if (props.options.some(x => x.ctrlKey === savedOption) || props.otherOptions?.variants.some(v => v.ctrlKey === savedOption)) {
        fireActiveOptionChange(savedOption);
        return;
      } else {
        logger.warn(`(OptionButtonGroup) last selected option has been read from storage, but respective button cannot be found: groupKey=${props.ctrlKey}, option=${savedOption}`);
      }
    }

    const firstEnabledOption = props.options.find(o => o.enabled === true && (o.ctrlKey !== props.otherOptions?.ctrlKey || props.otherOptions!.variants.some(v => v.enabled)));
    if (firstEnabledOption) {
      if (firstEnabledOption.ctrlKey === props.otherOptions?.ctrlKey) {
        const firstEnabledOtherOptionVariant = props.otherOptions!.variants.find(v => v.enabled === true)!;
        logger.debug(`(OptionButtonGroup) setting other option variant active: groupKey=${props.ctrlKey}, optionKey=${firstEnabledOtherOptionVariant.ctrlKey}`);
        fireActiveOptionChange(firstEnabledOtherOptionVariant.ctrlKey);
      } else {
        logger.debug(`(OptionButtonGroup) setting option active: groupKey=${props.ctrlKey}, optionKey=${firstEnabledOption.ctrlKey}`);
        fireActiveOptionChange(firstEnabledOption.ctrlKey);
      }
    } else {
      logger.verbose(`(OptionButtonGroup) all options are disabled, nothing to make active: groupKey=${props.ctrlKey}`);
    }
  }
}

onMounted(() => {
  initActiveOption();
});

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
      v-for="o in props.options"
      :key="o.ctrlKey"
      :ctrl-key="o.ctrlKey"
      :is-active="(props.activeOptionCtrl && props.activeOptionCtrl === o.ctrlKey) ? true : false"
      :label-res-name="o.labelResName"
      :short-icon="o.shortIcon"
      :subtext-res-name="o.subtextResName"
      :subtext-res-args="o.subtextResArgs"
      :enabled="o.enabled"
      :tab-name="o.tabName"
      :role="role === 'radiogroup' ? { role: 'radio' } : { role: 'tab', tabPanelId: (o.role as any).tabPanelId }"
      @click="onOptionButtonClick"
    />
    <OtherOptionsButton
      v-if="otherOptions"
      :ctrl-key="`${props.ctrlKey}-otherOpts`"
      :default-res-name="props.otherOptions!.defaultResName"
      :selected-res-name="props.otherOptions!.selectedResName"
      :subtext-res-name="props.otherOptions!.subtextResName"
      :subtext-res-args="props.otherOptions!.subtextResArgs"
      :variants="props.otherOptions!.variants.map(v => {
        return {
          ...v,
          isActive: props.activeOptionCtrl === v.ctrlKey
        };
      })"
      :role="{ role: 'radio' }"
      :enabled="props.otherOptions!.enabled"
      @item-click="onOptionButtonClick"
    />
  </section>
</template>
