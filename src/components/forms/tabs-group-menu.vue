<script setup lang="ts">
import type { DropdownListValue, IDropdownListItemProps } from './../../types';
import { areCtrlKeysEqual, type ControlKey } from '../../helpers/components';
import { isArray } from 'lodash';

interface ISortInfoProps {
  ctrlKey: ControlKey,
  label: string,
  items: IDropdownListItemProps[]
}

const { items } = defineProps<ISortInfoProps>();
const tabModel = defineModel<DropdownListValue>('modelValue', { required: false });

const selected = ref<IDropdownListItemProps | undefined>(tabModel.value ? (items.find(i => i.value === tabModel.value)) : undefined);

onMounted(() => {
  watch(selected, () => {
    if(selected.value?.value) {
      tabModel.value = selected.value?.value;
    }
  }, { immediate: false });
  watch(tabModel, () => {
    selected.value = tabModel.value ? (
      items.find(i => isArray(i.value) ? 
        (areCtrlKeysEqual(i.value, tabModel.value! as ControlKey)) : 
        i.value === tabModel!.value
      )
    ) : undefined;
  }, { immediate: false });
});

</script>

<template>
  <ClientOnly>
    <USelectMenu 
      v-model="selected" 
      :options="items" 
      by="value" 
      option-attribute="resName" 
      class="w-full font-medium" 
      variant="none" 
      color="gray"
      :ui="{ 
        base: 'w-full p-2 sm:py-3 flex flex-row flex-nowrap gap-2 items-center justify-start'
      }"
      :ui-menu="{ width: 'min-w-fit' }"
    >
      <template #label>
        <div class="w-full h-auto flex flex-row flex-nowrap items-center justify-start">
          <UIcon name="cil-hamburger-menu" class="w-5 h-5"/>
          <span class="pl-2 truncate text-ellipsis">{{ label }}</span>
        </div>
      </template>

      <template #option="{ option: item }">
        <span class="truncate">{{ $t(item.resName) }}</span>
      </template>
    </USelectMenu>
    <template #fallback>
      <USkeleton class="w-1/2 h-4 float-right" />
    </template>
  </ClientOnly>
</template>
