<script setup lang="ts">
import { type IOtherOptionsButtonGroupProps } from './../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';

const props = defineProps<IOtherOptionsButtonGroupProps>();

const { t } = useI18n();

const hasActiveItem = computed(() => {
  return props.variants.some(v => v.enabled && v.isActive === true);
});

const buttonLabel = computed(() => {
  const variantLabelResName = hasActiveItem.value ? props.variants.find(v => v.isActive)!.labelResName : undefined;
  return hasActiveItem.value ? t(props.selectedResName, { variantLabel: t(variantLabelResName!) }) : t(props.defaultResName);
});

const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

function onActivate (itemCtrlKey: string) {
  $emit('itemClick', itemCtrlKey);
  dropdown.value?.hide();
}

function onEscape () {
  dropdown.value?.hide();
}

function onClick () {
  if (!dropdown.value) {
    return;
  }

  const isShown = (dropdown.value.$el.className as string).includes('v-popper--shown');
  if (isShown) {
    dropdown.value.hide();
  } else {
    dropdown.value.show();
  }
}

function onDropdownShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onDropdownHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

const $emit = defineEmits<{(event: 'itemClick', ctrlKey: string): void}>();

const htmlId = useId();

</script>

<template>
  <div
    :id="`other-options-menu-anchor-${props.ctrlKey}`"
    :class="`option-button tabbable ${hasActiveItem ? 'active' : ''} ${enabled ? 'enabled' : 'disabled'}`"
    @click="onClick"
    @keyup.space="onClick"
    @keyup.enter="onClick"
    @keyup.escape="onEscape"
  >
    <div class="option-button-separator" role="separator" />
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
      :distance="6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      :show-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom"
      :flip="false"
      :skidding="-100"
      theme="options-button-dropdown"
      no-auto-focus
      @apply-show="onDropdownShown"
      @apply-hide="onDropdownHide"
    >
      <div :class="`option-button-div other-options-button-div`">
        <div class="option-button-icon option-button-icon-menu mr-xs-2" />
        <div class="other-options-button-content">
          <div class="option-button-label">
            {{ buttonLabel }}
          </div>
          <div v-if="subtextResName" class="option-button-subtext mt-xs-2">
            {{ $t(subtextResName, subtextResArgs) }}
          </div>
        </div>
      </div>
      <template #popper>
        <ol :class="`options-button-dropdown dropdown-list ${hasActiveItem ? 'active' : ''}`" :data-popper-anchor="`other-options-menu-anchor-${props.ctrlKey}`">
          <li
            v-for="v in props.variants"
            :key="v.ctrlKey"
            :class="`dropdown-list-item px-xs-2 ${v.isActive ? 'active' : ''} ${v.enabled ? 'enabled' : 'disabled'}`"
            @click="() => { if(v.enabled) { onActivate(v.ctrlKey); } }"
          >
            <span class="options-button-dropdown-active-icon mr-xs-1" />
            <span
              :id="htmlId"
              :class="`options-button-dropdown-text brdr-1 tabbable ${v.isActive ? 'active' : ''} ${v.enabled ? 'enabled' : 'disabled'}`"
              role="radio"
              :aria-checked="v.enabled"
              :aria-labelledby="htmlId"
              @click="() => { if(v.enabled) { onActivate(v.ctrlKey); } }"
              @keyup.space="() => { if(v.enabled) { onActivate(v.ctrlKey); } }"
              @keyup.enter="() => { if(v.enabled) { onActivate(v.ctrlKey); } }"
            >{{ $t(v.labelResName) }}</span>
          </li>
        </ol>
      </template>
    </VDropdown>
  </div>
</template>
