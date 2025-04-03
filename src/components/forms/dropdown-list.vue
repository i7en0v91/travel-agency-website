<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import { toShortForm } from '../../helpers/components';
import type { IDropdownListProps, IDropdownListItemProps, DropdownListValue } from './../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import FieldFrame from './../forms/field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

const { 
  ctrlKey,
  items, 
  persistent = undefined, 
  placeholderResName,
  listContainerClass = '', 
  kind = 'primary' 
} = defineProps<IDropdownListProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DropdownList' });
const controlValuesStore = useControlValuesStore();

const { t } = useI18n();

const modelValue = defineModel<string | null | undefined>('selectedValue');
const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
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

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

function onEscape () {
  hideDropdown();
}

function updateSelectedValue (value?: DropdownListValue | undefined) {
  logger.verbose('updating selected value', { ctrlKey, value });
  modelValue.value = value?.toString() ?? null;
}

function onActivate (item: IDropdownListItemProps) {
  logger.verbose('list item activated', { ctrlKey, value: item.value });
  hideDropdown();
  updateSelectedValue(item.value);
}

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef(ctrlKey, {
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

  hasMounted.value = true;
});

</script>

<template>
  <div class="dropdown-list" @keyup.escape="onEscape">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="[...ctrlKey, 'Wrapper']"
      :aria-id="`${toShortForm(ctrlKey)}-DropDownWrapper`"
      :distance="-6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom-end"
      :prevent-overflow="kind === 'primary' ? true : false"
      :flip="false"
      :boundary="openBtn"
      :theme="kind === 'primary' ? 'control-dropdown' : 'secondary-dropdown'"
      no-auto-focus
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <FieldFrame :text-res-name="captionResName" class="dropdown-list-field-frame">
        <button
          :id="`dropdown-list-${toShortForm(ctrlKey)}`"
          ref="open-btn"
          class="dropdown-list-btn brdr-1"
          type="button"
          @keyup.escape="hideDropdown"
        >
          {{ selectedItemDisplayName }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <ol :class="`dropdown-list ${listContainerClass}`" :data-popper-anchor="`dropdown-list-${toShortForm(ctrlKey)}`">
            <li
              v-for="(item, idx) in items"
              :key="`${toShortForm(ctrlKey)}-v${idx}`"
              role="listitem"
              class="dropdown-list-item p-xs-1 brdr-1 tabbable"
              @onActivate="() => onActivate(item)"
              @click="() => { onActivate(item); }"
              @keyup.space="() => { onActivate(item); }"
              @keyup.enter="() => { onActivate(item); }"
              @keyup.escape="onEscape"
            >
              {{ $t(item.resName) }}
            </li>
          </ol>
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>
