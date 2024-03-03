<script setup lang="ts">
import { Dropdown } from 'floating-vue';
import { type IDropdownListProps, type IDropdownListItemProps, type DropdownListValue } from './../../shared/interfaces';
import { updateTabIndices } from './../../shared/dom';
import FieldFrame from './../forms/field-frame.vue';
import { type I18nResName } from './../../shared/i18n';
import { TabIndicesUpdateDefaultTimeout } from './../../shared/constants';

const props = withDefaults(defineProps<IDropdownListProps>(), {
  selectedValue: undefined,
  defaultValue: undefined,
  placeholderResName: undefined,
  initiallySelectedValue: undefined,
  listContainerClass: '',
  kind: 'primary'
});

const elBtn = ref<HTMLElement>();
const dropdown = ref<InstanceType<typeof Dropdown>>();
const hasMounted = ref(false);

const logger = CommonServicesLocator.getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<DropdownListValue | undefined>(props.ctrlKey, props.defaultValue, props.persistent);
const selectedItemResName = ref<I18nResName | undefined>();
if (props.initiallySelectedValue) {
  controlValueSetting.value = props.initiallySelectedValue;
  selectedItemResName.value = lookupValueResName(controlValueSetting.value);
} else if (props.initiallySelectedValue === null) {
  controlValueSetting.value = props.defaultValue;
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
    const itemProps = props.items.find(i => i.value === value);
    return itemProps?.resName;
  } else {
    return undefined;
  }
}

const $emit = defineEmits<{(event: 'update:selectedValue', value?: DropdownListValue | undefined): void}>();

function updateSelectedValue (value?: DropdownListValue | undefined) {
  logger.verbose(`(DropdownList) updating selected value: ctrlKey=${props.ctrlKey}, value=${value}`);
  controlValueSetting.value = value;
  selectedItemResName.value = lookupValueResName(value);
  $emit('update:selectedValue', value);
  logger.verbose(`(DropdownList) selected value updated: ctrlKey=${props.ctrlKey}, value=${value}`);
}

function onActivate (item: IDropdownListItemProps) {
  logger.verbose(`(DropdownList) list item activated: ctrlKey=${props.ctrlKey}, value=${item.value}`);
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
  if (controlValueSetting.value || (props.initiallySelectedValue !== undefined)) {
    $emit('update:selectedValue', controlValueSetting.value);
  }
  watch(() => props.selectedValue, () => {
    updateSelectedValue(props.selectedValue);
  });
});

</script>

<template>
  <!-- not using role="list" as w3c audit may fail because of "listitem" elements are not direct children, but instead is rendered in a separate floating-vue container -->
  <div class="dropdown-list" @keyup.escape="onEscape">
    <VDropdown
      ref="dropdown"
      :distance="-6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom-end"
      :prevent-overflow="kind === 'primary' ? true : false"
      :flip="false"
      :boundary="elBtn"
      :theme="kind === 'primary' ? 'control-dropdown' : 'secondary-dropdown'"
      no-auto-focus
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <FieldFrame :text-res-name="captionResName" class="dropdown-list-field-frame">
        <button
          :id="`dropdown-list-${props.ctrlKey}`"
          ref="elBtn"
          class="dropdown-list-btn brdr-1"
          type="button"
          @keyup.escape="hideDropdown"
        >
          {{ (hasMounted || !persistent) ? (selectedItemResName ? $t(selectedItemResName) : (placeholderResName ? $t(placeholderResName) : '')) : '' }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <ol :class="`dropdown-list ${listContainerClass}`" :data-popper-anchor="`dropdown-list-${props.ctrlKey}`">
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
