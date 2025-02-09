<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import type { IDropdownListProps, IDropdownListItemProps, DropdownListValue } from './../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import FieldFrame from './../forms/field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

const { 
  selectedValue, 
  items, 
  initiallySelectedValue, 
  persistent, 
  defaultValue, 
  ctrlKey, 
  listContainerClass = '', 
  kind = 'primary' 
} = defineProps<IDropdownListProps>();

const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const hasMounted = ref(false);

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<DropdownListValue | undefined>(ctrlKey, defaultValue, persistent);
const selectedItemResName = ref<I18nResName | undefined>();
if (initiallySelectedValue) {
  controlValueSetting.value = initiallySelectedValue;
  selectedItemResName.value = lookupValueResName(controlValueSetting.value);
} else if (initiallySelectedValue === null) {
  controlValueSetting.value = defaultValue;
  selectedItemResName.value = lookupValueResName(controlValueSetting.value);
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

function lookupValueResName (value?: DropdownListValue | undefined) : I18nResName | undefined {
  if (value) {
    const itemProps = items.find(i => i.value === value);
    return itemProps?.resName;
  } else {
    return undefined;
  }
}

const $emit = defineEmits<{(event: 'update:selectedValue', value?: DropdownListValue | undefined): void}>();

function updateSelectedValue (value?: DropdownListValue | undefined) {
  logger.verbose(`(DropdownList) updating selected value: ctrlKey=${ctrlKey}, value=${value}`);
  controlValueSetting.value = value;
  selectedItemResName.value = lookupValueResName(value);
  $emit('update:selectedValue', value);
  logger.verbose(`(DropdownList) selected value updated: ctrlKey=${ctrlKey}, value=${value}`);
}

function onActivate (item: IDropdownListItemProps) {
  logger.verbose(`(DropdownList) list item activated: ctrlKey=${ctrlKey}, value=${item.value}`);
  hideDropdown();
  updateSelectedValue(item.value);
}

function onEscape () {
  hideDropdown();
}

onBeforeMount(() => {
  selectedItemResName.value = lookupValueResName(controlValueSetting.value);
});
onMounted(() => {
  hasMounted.value = true;
  if (controlValueSetting.value || (initiallySelectedValue !== undefined)) {
    $emit('update:selectedValue', controlValueSetting.value);
  }
  watch(() => selectedValue, () => {
    updateSelectedValue(selectedValue);
  });
});

</script>

<template>
  <!-- not using role="list" as w3c audit may fail because of "listitem" elements are not direct children, but instead is rendered in a separate floating-vue container -->
  <div class="dropdown-list" @keyup.escape="onEscape">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
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
          :id="`dropdown-list-${ctrlKey}`"
          ref="open-btn"
          class="dropdown-list-btn brdr-1"
          type="button"
          @keyup.escape="hideDropdown"
        >
          {{ (hasMounted || !persistent) ? (selectedItemResName ? $t(selectedItemResName) : (placeholderResName ? $t(placeholderResName) : '')) : '' }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <ol :class="`dropdown-list ${listContainerClass}`" :data-popper-anchor="`dropdown-list-${ctrlKey}`">
            <li
              v-for="(item, idx) in items"
              :key="`${ctrlKey}-v${idx}`"
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
