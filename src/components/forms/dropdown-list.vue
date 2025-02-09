<script setup lang="ts">
import type { IDropdownListProps, IDropdownListItemProps, DropdownListValue } from './../../types';
import InputFieldFrame from './input-field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

const {
  items, 
  persistent, 
  defaultValue, 
  ctrlKey, 
  variant = 'default' 
} = defineProps<IDropdownListProps>();
const modelRef = defineModel<DropdownListValue | null | undefined>('selectedValue');
const selectedMenuItem = ref<IDropdownListItemProps | undefined>();

const { t } = useI18n();

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<DropdownListValue | null | undefined>(ctrlKey, defaultValue, persistent);
if(modelRef.value !== undefined) {
  controlValueSetting.value = modelRef.value;
  selectedMenuItem.value = modelRef.value ? lookupItemByValue(modelRef.value) : undefined;
}

function lookupItemByValue (value: DropdownListValue) : IDropdownListItemProps | undefined {
  const result = items.find(i => i.value === value);
  if(!result) {
    logger.warn(`(DropdownList) failed to lookup item by value: ctrlKey=${ctrlKey}, value=${value}`);
  }
  return result;
}

function setSelectedValue (item?: IDropdownListItemProps | undefined) {
  logger.verbose(`(DropdownList) setting selected value: ctrlKey=${ctrlKey}, value=${item?.value}`);
  controlValueSetting.value = item?.value;
  selectedMenuItem.value = item;
  modelRef.value = item?.value;
  logger.verbose(`(DropdownList) selected value was set: ctrlKey=${ctrlKey}, value=${item?.value}`);
}

function saveInitialValuesToSettings() {
  if (modelRef.value) {
    controlValueSetting.value = modelRef.value;
  } else if (modelRef.value === null) {
    controlValueSetting.value = defaultValue;
  }
}

const hasMounted = ref(false);

onMounted(() => {
  saveInitialValuesToSettings();
  
  if(selectedMenuItem.value === undefined) {
    let lookedUpValue: IDropdownListItemProps | undefined;
    if(controlValueSetting.value) {
      lookedUpValue = lookupItemByValue(controlValueSetting.value);
    }
    if(lookedUpValue) {
      selectedMenuItem.value = lookedUpValue;
    }
  }
  
  watch(selectedMenuItem, () => {
    logger.debug(`(DropdownList) selected menu value change handler: ctrlKey=${ctrlKey}, value=${selectedMenuItem.value}`);
    setSelectedValue(selectedMenuItem.value);
  }, { immediate: true });

  watch(modelRef, () => {
    if((!!modelRef.value && modelRef.value === selectedMenuItem.value?.value) || (!modelRef.value && selectedMenuItem.value === undefined)) {
      return;
    }

    const valueItem = modelRef.value ? lookupItemByValue(modelRef.value) : undefined;
    logger.debug(`(DropdownList) selected value changed, setting selected menu item: ctrlKey=${ctrlKey}, value=${modelRef.value}, displayName=${valueItem ? t(valueItem.resName) : undefined}`);
    setSelectedValue(valueItem);
  });

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
        <span v-if="(selectedMenuItem !== undefined && selectedMenuItem !== null) && (hasMounted || !persistent)" class="truncate">{{ $t(selectedMenuItem.resName) }}</span>
        <span v-else>{{ placeholderResName ? t(placeholderResName) : undefined }}</span>
      </template>

      <template #option="{ option: item }">
        <span class="overflow-hidden text-ellipsis">{{ $t(item.resName) }}</span>
      </template>
    </USelectMenu>
  </component>
</template>
