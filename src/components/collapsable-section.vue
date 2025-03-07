<script setup lang="ts">
import { toShortForm, type ControlKey } from './../helpers/components';
import { getI18nResName2 } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../helpers/dom';
import throttle from 'lodash-es/throttle';
import { getCommonServices } from '../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  collapseable: boolean,
  persistent?: boolean,
  defaultCollapsed?: boolean,
  tabbableGroupId?: string,
  showCollapsableButton?: boolean
}

const { 
  ctrlKey, 
  collapseable, 
  defaultCollapsed = false,
  showCollapsableButton = true, 
  persistent = false 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'CollapsableSection' });
const controlValuesStore = useControlValuesStore();

const sectionHtmlElId = computed(() => toShortForm(ctrlKey));
const collapsed = defineModel<boolean | null | undefined>('collapsed');
const toggling = ref(false);
const sectionHtmlElMaxHeight = ref('0px');

defineExpose({
  toggle,
  expand,
  collapse
});

function toggle () {
  if (!toggling.value) {
    const newValue = !collapsed.value;
    toggling.value = collapseable;
    if (!collapseable) {
      setTimeout(updateSectionMaxHeightHtmlVar, 0);
    }
    logger.debug('changing state', { ctrlKey, toggled: newValue });
    collapsed.value = newValue;
  }
}

function expand () {
  if (collapsed.value) {
    toggle();
  }
}

function collapse () {
  if (!collapsed.value) {
    toggle();
  }
}

function onAnimationStart () {
  if (collapseable) {
    toggling.value = true;
    setTimeout(updateSectionMaxHeightHtmlVar, 0);
  }
}

function updateSectionMaxHeightHtmlVar () {
  logger.debug('updating section max height', ctrlKey);
  const htmlElQuery = document.querySelectorAll(`#${sectionHtmlElId.value} .collapsable-section-content > *:first-child`);
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
  if (collapseable) {
    toggling.value = false;
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

const onWindowResize = () => setTimeout(throttle(function () {
  setTimeout(updateSectionMaxHeightHtmlVar, 0);
}), 100);

onMounted(() => {
  if(persistent) {
    const initialOverwrite = (collapsed.value !== null && collapsed.value !== undefined) ? collapsed.value : undefined;
    logger.debug('acquiring store ref', { ctrlKey, defaultValue: defaultCollapsed, initialOverwrite });
    const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<boolean | null>(ctrlKey, {
      initialOverwrite,
      defaultValue: defaultCollapsed,
      persistent
    });

    watch(storeValueRef, () => {
      logger.debug('store value watcher', { ctrlKey, modelValue: collapsed.value, storeValue: storeValueRef.value });
      const newValue: boolean = storeValueRef.value ?? defaultCollapsed;
      const changed = storeValueRef.value !== collapsed.value;
      if(changed) {
        collapsed.value = newValue;  
      }
    }, { immediate: true });

    watch(collapsed, () => {
      logger.debug('model value watcher', { ctrlKey, modelValue: collapsed.value, storeValue: storeValueRef.value });
      if(collapsed.value !== storeValueRef.value) {
        storeValueRef.value = (collapsed.value !== null && collapsed.value !== undefined) ? collapsed.value : null;
      }
    }, { immediate: false });
  }

  if (!collapsed.value) {
    setTimeout(updateSectionMaxHeightHtmlVar, 0);
  }

  if (collapseable) {
    window.addEventListener('resize', onWindowResize);
  }
});

onUnmounted(() => {
  if (collapseable) {
    window.removeEventListener('resize', onWindowResize);
  }
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
