<script setup lang="ts">

import throttle from 'lodash-es/throttle';
import { updateTabIndices } from './../shared/dom';
import { TabIndicesUpdateDefaultTimeout } from './../shared/constants';
import { getI18nResName2 } from './../shared/i18n';

interface IProps {
  ctrlKey: string,
  collapseEnabled: boolean,
  collapsed: boolean,
  tabbableGroupId?: string,
  showCollapsableButton?: boolean,
  persistent?: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  tabbableGroupId: undefined,
  showCollapsableButton: true,
  persistent: true
});

const sectionHtmlElId = props.ctrlKey;

const controlSettingsStore = useControlSettingsStore();
const controlSingleValueSetting = props.persistent ? controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(`${props.ctrlKey}-collapsed`, 'expanded', true) : undefined;

const logger = CommonServicesLocator.getLogger();
const toggling = ref(false);

function toggle () {
  if (!toggling.value) {
    const newValue = !props.collapsed;
    toggling.value = props.collapseEnabled && true;
    if (controlSingleValueSetting) {
      controlSingleValueSetting.value = newValue ? 'collapsed' : 'expanded';
    }
    if (!props.collapseEnabled) {
      setTimeout(updateSectionMaxHeightHtmlVar, 0);
    }
    logger.debug(`(CollapsableSection) changing state, ctrlKey=${props.ctrlKey}, new toggled=${newValue}`);
    $emit('update:collapsed', newValue);
  }
}

function expand () {
  if (props.collapsed) {
    toggle();
  }
}

function collapse () {
  if (!props.collapsed) {
    toggle();
  }
}

const sectionHtmlElMaxHeight = ref('0px');
function onAnimationStart () {
  if (props.collapseEnabled) {
    toggling.value = true;
    setTimeout(updateSectionMaxHeightHtmlVar, 0);
  }
}

function updateSectionMaxHeightHtmlVar () {
  logger.debug(`(CollapsableSection) updating section max height, ctrlKey=${props.ctrlKey}`);
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
  if (props.collapseEnabled) {
    toggling.value = false;
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

const $emit = defineEmits<{(event: 'update:collapsed', value?: boolean): void}>();

const onWindowResize = () => setTimeout(throttle(function () {
  setTimeout(updateSectionMaxHeightHtmlVar, 0);
}), 100);

onMounted(() => {
  let initiallyCollapsed = props.collapsed;
  if (props.collapseEnabled) {
    if (controlSingleValueSetting) {
      const initValue = controlSingleValueSetting.value === 'collapsed';
      if (initValue !== props.collapsed) {
        logger.debug(`(CollapsableSection) initial collapsed state in settings differs from passed in props, ctrlKey=${props.ctrlKey}, props=${props.collapsed}, settings=${initValue}`);
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
  if (props.collapseEnabled) {
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
