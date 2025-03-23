<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import type { IDropdownListProps, IDropdownListItemProps, DropdownListValue } from './../../types';
import InputFieldFrame from './input-field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import { useControlValuesStore } from '../../stores/control-values-store';

const {
  items, 
  persistent = undefined, 
  placeholderResName,
  ctrlKey, 
  variant = 'default' 
} = defineProps<IDropdownListProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DropdownList' });
const controlValuesStore = useControlValuesStore();
const { t } = useI18n();

const modelValue = defineModel<DropdownListValue | null | undefined>('selectedValue');
const selectedMenuItem = ref<IDropdownListItemProps | undefined>();
const hasMounted = ref(false);

const selectedItemDisplayName = computed(() => {
  if(persistent && !hasMounted.value) {
    return '';
  }
  const selectedItemResName = modelValue.value ? lookupValueResName(modelValue.value) : null;
  return selectedItemResName ? t(selectedItemResName) : (placeholderResName ? t(placeholderResName) : '');
});

function lookupValueResName (value?: DropdownListValue | undefined) : I18nResName | undefined {
  if (value) {
    const itemProps = items.find(i => i.value === value);
    return itemProps?.resName;
  } else {
    return undefined;
  }
}

function updateSelectedValue (value?: DropdownListValue | undefined) {
  logger.verbose('updating selected value', { ctrlKey, value });
  modelValue.value = value?.toString() ?? null;
}

onMounted(() => {
  //const initialOverwrite = modelValue.value;
  logger.debug('acquiring store value ref', { ctrlKey /* defaultValue, initialOverwrite */ });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<DropdownListValue | null>(ctrlKey, {
    /*
    initialOverwrite,
    defaultValue,
    */
    persistent
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue: string | null = (storeValueRef.value as string) ?? null;
    const changed = storeValueRef.value !== modelValue.value;
    if(changed) {
      modelValue.value = newValue;  
    }
  }, { immediate: true });

  watch(modelValue, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    if(modelValue.value !== storeValueRef.value) {
      storeValueRef.value = modelValue.value ?? null;
    }
  }, { immediate: false });

  watch(selectedMenuItem, () => {
    logger.debug('selected menu item watcher', { ctrlKey, value: selectedMenuItem.value });
    updateSelectedValue(selectedMenuItem.value?.value);
  }, { immediate: false });

  hasMounted.value = true;
});

</script>

<template>
  <component :is="variant === 'default' ? InputFieldFrame : 'div'" :text-res-name="variant === 'default' ? captionResName : undefined" :class="variant === 'default' ? ui?.wrapper : undefined">
    <USelectMenu 
      v-model="selectedMenuItem" 
      :options="items" 
      by="value" 
      option-attribute="resName" 
      :placeholder="placeholderResName ? t(placeholderResName) : undefined" 
      class="w-full font-medium" 
      :variant="variant === 'default' ? 'outline' : 'none'" 
      color="gray"
      :ui="{ 
        base: ui?.input, 
        padding: variant === 'none' ? { sm: 'px-1 py-1' } : undefined 
      }"
      :ui-menu="{ width: 'min-w-fit' }"
    >
      <template #label>
        {{ selectedItemDisplayName }}
      </template>

      <template #option="{ option: item }">
        <span class="overflow-hidden text-ellipsis">{{ $t(item.resName) }}</span>
      </template>
    </USelectMenu>
  </component>
</template>
