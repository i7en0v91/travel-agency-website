<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../helpers/dom';
import throttle from 'lodash-es/throttle';
import { getCommonServices } from '../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  collapseEnabled: boolean,
  collapsed: boolean,
  tabbableGroupId?: string,
  showCollapsableButton?: boolean,
  persistent?: boolean
}

const { ctrlKey, collapsed, collapseEnabled, showCollapsableButton = true, persistent = true } = defineProps<IProps>();

const sectionHtmlElId = ctrlKey;

const controlSettingsStore = useControlSettingsStore();
const controlSingleValueSetting = persistent ? controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(`${ctrlKey}-collapsed`, 'expanded', true) : undefined;

const logger = getCommonServices().getLogger();
const toggling = ref(false);

function toggle () {
  if (!toggling.value) {
    const newValue = !collapsed;
    toggling.value = collapseEnabled && true;
    if (controlSingleValueSetting) {
      controlSingleValueSetting.value = newValue ? 'collapsed' : 'expanded';
    }
    if (!collapseEnabled) {
      setTimeout(updateSectionMaxHeightHtmlVar, 0);
    }
    logger.debug(`(CollapsableSection) changing state, ctrlKey=${ctrlKey}, new toggled=${newValue}`);
    $emit('update:collapsed', newValue);
  }
}

function expand () {
  if (collapsed) {
    toggle();
  }
}

function collapse () {
  if (!collapsed) {
    toggle();
  }
}

const sectionHtmlElMaxHeight = ref('0px');
function onAnimationStart () {
  if (collapseEnabled) {
    toggling.value = true;
    setTimeout(updateSectionMaxHeightHtmlVar, 0);
  }
}

function updateSectionMaxHeightHtmlVar () {
  logger.debug(`(CollapsableSection) updating section max height, ctrlKey=${ctrlKey}`);
  const htmlElQuery = document.querySelectorAll(`#${sectionHtmlElId} .collapsable-section-content > *:first-child`);
  if (htmlElQuery.length === 0) {
    return;
  }
  const sectionHtmlEl = htmlElQuery[0];
  const elHeight = sectionHtmlEl.getClientRects()[0]?.height ?? 0;
  if (elHeight > 0) {
    sectionHtmlElMaxHeight.value = `${elHeight}px`;
  }
}

function onAnimationEnd () {
  if (collapseEnabled) {
    toggling.value = false;
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

const $emit = defineEmits<{(event: 'update:collapsed', value?: boolean): void}>();

const onWindowResize = () => setTimeout(throttle(function () {
  setTimeout(updateSectionMaxHeightHtmlVar, 0);
}), 100);

onMounted(() => {
  let initiallyCollapsed = collapsed;
  if (collapseEnabled) {
    if (controlSingleValueSetting) {
      const initValue = controlSingleValueSetting.value === 'collapsed';
      if (initValue !== collapsed) {
        logger.debug(`(CollapsableSection) initial collapsed state in settings differs from passed in props, ctrlKey=${ctrlKey}, props=${collapsed}, settings=${initValue}`);
        initiallyCollapsed = initValue;
        toggle();
      }
    }

    window.addEventListener('resize', onWindowResize);
  }

  if (!initiallyCollapsed) {
    setTimeout(updateSectionMaxHeightHtmlVar, 0);
  }
});

onUnmounted(() => {
  if (collapseEnabled) {
    window.removeEventListener('resize', onWindowResize);
  }
});

defineExpose({
  toggle,
  expand,
  collapse
});

</script>

<template>
  <div
    :id="sectionHtmlElId"
    class="collapsable-section"
    :style="{
      '--glb-collapsable-section-height': sectionHtmlElMaxHeight
    }"
  >
    <div class="collapsable-section-head">
      <slot name="head" />
    </div>
    <button
      v-if="showCollapsableButton"
      :class="`collapsable-section-btn brdr-1 pb-xs-1 mt-xs-1 ${(collapsed ? 'collapsed' : '')} ${tabbableGroupId ? `tabbable-group-${tabbableGroupId}` : ''}`"
      type="button"
      :aria-label="$t(getI18nResName2('ariaLabels', 'ariaLabelToggleSection'))"
      @keyup.enter="toggle"
      @keyup.space="toggle"
      @click="toggle"
    />
    <Transition
      name="collapsable-section"
      @enter="onAnimationStart"
      @leave="onAnimationStart"
      @after-enter="onAnimationEnd"
      @after-leave="onAnimationEnd"
    >
      <div v-show="!collapsed" :class="`collapsable-section-content ${(collapsed ? 'collapsed' : '')}`">
        <slot name="content" />
      </div>
    </Transition>
  </div>
</template>
