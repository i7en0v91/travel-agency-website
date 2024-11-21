<script setup lang="ts">
import { type IDropdownListProps, type IDropdownListItemProps, type DropdownListValue } from './../../types';
import InputFieldFrame from './input-field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

const props = withDefaults(defineProps<IDropdownListProps>(), {
  variant: 'default',
  defaultValue: undefined,
  placeholderResName: undefined
});
const modelRef = defineModel<DropdownListValue | null | undefined>('selectedValue');
const selectedMenuItem = ref<IDropdownListItemProps | undefined>();

const { t } = useI18n();

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<DropdownListValue | null | undefined>(props.ctrlKey, props.defaultValue, props.persistent);
if(modelRef.value !== undefined) {
  controlValueSetting.value = modelRef.value;
  selectedMenuItem.value = modelRef.value ? lookupItemByValue(modelRef.value) : undefined;
}

function lookupItemByValue (value: DropdownListValue) : IDropdownListItemProps | undefined {
  const result = props.items.find(i => i.value === value);
  if(!result) {
    logger.warn(`(DropdownList) failed to lookup item by value: ctrlKey=${props.ctrlKey}, value=${value}`);
  }
  return result;
}

function setSelectedValue (item?: IDropdownListItemProps | undefined) {
  logger.verbose(`(DropdownList) setting selected value: ctrlKey=${props.ctrlKey}, value=${item?.value}`);
  controlValueSetting.value = item?.value;
  selectedMenuItem.value = item;
  modelRef.value = item?.value;
  logger.verbose(`(DropdownList) selected value was set: ctrlKey=${props.ctrlKey}, value=${item?.value}`);
}

function saveInitialValuesToSettings() {
  if (modelRef.value) {
    controlValueSetting.value = modelRef.value;
  } else if (modelRef.value === null) {
    controlValueSetting.value = props.defaultValue;
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
    logger.debug(`(DropdownList) selected menu value change handler: ctrlKey=${props.ctrlKey}, value=${selectedMenuItem.value}`);
    setSelectedValue(selectedMenuItem.value);
  }, { immediate: true });

  watch(modelRef, () => {
    if((!!modelRef.value && modelRef.value === selectedMenuItem.value?.value) || (!modelRef.value && selectedMenuItem.value === undefined)) {
      return;
    }

    const valueItem = modelRef.value ? lookupItemByValue(modelRef.value) : undefined;
    logger.debug(`(DropdownList) selected value changed, setting selected menu item: ctrlKey=${props.ctrlKey}, value=${modelRef.value}, displayName=${valueItem ? t(valueItem.resName) : undefined}`);
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
      :placeholder="props.placeholderResName ? t(props.placeholderResName) : undefined" 
      class="w-full font-medium" 
      :variant="variant === 'default' ? 'outline' : 'none'" 
      color="gray"
      :ui="{ 
        base: props.ui?.input, 
        padding: props.variant === 'none' ? { sm: 'px-1 py-1' } : undefined 
      }"
      :ui-menu="{ width: 'min-w-fit' }"
    >
      <template #label>
        <span v-if="(selectedMenuItem !== undefined && selectedMenuItem !== null) && (hasMounted || !persistent)" class="truncate">{{ $t(selectedMenuItem.resName) }}</span>
        <span v-else>{{ props.placeholderResName ? t(props.placeholderResName) : undefined }}</span>
      </template>

      <template #option="{ option: item }">
        <span class="overflow-hidden text-ellipsis">{{ $t(item.resName) }}</span>
      </template>
    </USelectMenu>
  </component>
</template>
