<script setup lang="ts">
import type { ITabGroupProps } from '../../types';
import { getCommonServices } from '../../helpers/service-accessors';
import has from 'lodash-es/has';
import { mergeConfig } from './../../node_modules/@nuxt/ui/dist/runtime/utils/index';
import TabsGroupMenu from './tabs-group-menu.vue';
import { useControlValuesStore } from '../../stores/control-values-store';
import { areCtrlKeysEqual, type ControlKey } from '../../helpers/components';
import { toShortForm } from '@golobe-demo/shared';

const { 
  ctrlKey, 
  tabs, 
  menu, 
  variant,
  defaultActiveTabKey = undefined,
  persistent = undefined,
  ui 
} = defineProps<ITabGroupProps>();

const OtherSortOptionsTabNameSlot = 'other';
const OtherSortOptionsTabCtrlKey: ControlKey = [...ctrlKey, 'OtherOptions'];

const logger = getCommonServices().getLogger().addContextProps({ component: 'TabsGroup' });
const controlValuesStore = useControlValuesStore();
const { t } = useI18n();

const selectedTabIndex = ref<number>();
const modelValue = defineModel<ControlKey | undefined>('activeTabKey');
const hasMounted = ref(false);

const DefaultTab = computed(() => { 
  if(defaultActiveTabKey) {
    return defaultActiveTabKey;
  }

  const firstEnabledTab = tabs.find(
    o => o.enabled === true && 
    (!areCtrlKeysEqual(o.ctrlKey, OtherSortOptionsTabCtrlKey) || menu!.variants.some(v => v.enabled))
  );
  if (firstEnabledTab) {
    if (areCtrlKeysEqual(firstEnabledTab.ctrlKey, OtherSortOptionsTabCtrlKey)) {
      const firstEnabledMenuVariant = menu!.variants.find(v => v.enabled === true)!;
      logger.debug('making menu variant as default', { ctrlKey, menuKey: firstEnabledMenuVariant.ctrlKey });
      return firstEnabledMenuVariant.ctrlKey;
    } else {
      logger.debug('making tab as default', { ctrlKey, tabKey: firstEnabledTab.ctrlKey });
      return firstEnabledTab.ctrlKey;
    }
  } else {
    logger.verbose('all tabs are disabled', ctrlKey);
    return tabs[0].ctrlKey;
  }
});

function getModelKeyByTabIndex(index: number): ControlKey | undefined {
  if(!tabs?.length || selectedTabIndex.value === null || selectedTabIndex.value === undefined) {
    return undefined;
  }

  if(index >= tabs.length) {
    const tabKey = menu?.variants ? menu?.variants[0].ctrlKey : undefined;
    if(!tabKey) {
      logger.warn('tab index is out of range', undefined, { ctrlKey, index, modelValue: modelValue.value, numTabs: tabs.length, numMenus: menu?.variants?.length });
      return undefined;
    }
    logger.debug('resolved tab key from menu by index', { ctrlKey, index, tabKey });
    return tabKey;
  } else {
    const tabKey = tabs[index].ctrlKey;
    logger.debug('resolved tab key by index', { ctrlKey, index, tabKey });
    return tabKey;
  }
}

function getTabIndexByModelKey(tabModelValue: ControlKey) {
  logger.debug('resolving tab index by model value', { ctrlKey, value: tabModelValue });
  
  let index = tabs.findIndex((item) => areCtrlKeysEqual(item.ctrlKey, tabModelValue));
  if(index < 0) {
    if(menu?.variants?.some(v => areCtrlKeysEqual(v.ctrlKey, tabModelValue))) {
      index = tabs.length;
    }
  }

  if (index < 0) {
    logger.warn('cannot find tab by model', undefined, { ctrlKey, value: tabModelValue });
    index = 0;
  }

  logger.debug('tab index resolved', { ctrlKey, value: tabModelValue, index });
  return index;
}


logger.debug('acquiring control value ref', { ctrlKey });
const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<ControlKey>(ctrlKey, {
  persistent
});

watch(() => storeValueRef.value ? toShortForm(storeValueRef.value) : undefined, () => {
  logger.debug('control value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
  const newValue: ControlKey = (storeValueRef.value as ControlKey) ?? DefaultTab.value;
  const changed = !modelValue.value || !areCtrlKeysEqual(newValue, modelValue.value);
  if(changed) {
    logger.verbose('model value changed via store value', { ctrlKey, newValue, prevValue: modelValue.value });
    modelValue.value = newValue;  
  }
}, { immediate: true });

watch(() => modelValue.value ? toShortForm(modelValue.value) : undefined, () => {
  logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
  if(!modelValue.value) {
    return;
  }

  if(!storeValueRef.value || !areCtrlKeysEqual(modelValue.value!, storeValueRef.value)) {
    storeValueRef.value = modelValue.value ?? DefaultTab.value;
  }
  const newTabIndex = getTabIndexByModelKey(modelValue.value);
  if(selectedTabIndex.value !== newTabIndex) {
    logger.verbose('selected tab index changed via model value', { ctrlKey, new: newTabIndex, prev: selectedTabIndex.value });
    selectedTabIndex.value = newTabIndex;
  }
}, { immediate: true });

watch(selectedTabIndex, () => {
  logger.debug('selected tab key watcher', { ctrlKey, selectedTabIndex: selectedTabIndex.value, modelValue: modelValue.value });
  if(!modelValue.value) {
    return;
  }
  if(otherMenuItems.value.length && selectedTabIndex.value === tabs.length) {
    logger.debug('ignoring selected tab key watcher - sorting cannot be changed by selecting other items menu tab', { ctrlKey, modelValue: modelValue.value });
    return;
  };

  const newTabKey = getModelKeyByTabIndex(selectedTabIndex.value!);
  if(!newTabKey) {
    return;
  }
  if(!modelValue.value || !areCtrlKeysEqual(modelValue.value, newTabKey)) {
    logger.verbose('selected tab key updated by selected index change', { ctrlKey, new: newTabKey, prev: modelValue.value });
    modelValue.value = newTabKey;
  }
}, { immediate: false });

const solid = (variant ?? 'solid') === 'solid';
const slotTabNames = tabs.some(ti => has(ti, 'label.slotName'));
const slotTabs = tabs.some(ti => has(ti, 'slotName'));

const hasOtherMenuItems = computed(() => !!menu?.variants?.length);

const tabsStyling = computed(() => {
  return mergeConfig('merge', { 
    container: '!mt-8 w-full',
    list: {
      base: solid ? 'gap-4 sm:gap-6' : undefined,
      padding: solid ? '!pl-0' : 'px-4 sm:px-6',
      width: solid ? 'w-auto' : undefined,
      shadow: !solid ? 'shadow-lg dark:shadow-gray-700' : undefined,
      rounded: !solid ? 'rounded-xl' : undefined,
      background: !solid ? 'bg-white dark:bg-gray-900' : undefined,
      tab: { 
        base: solid ? 'justify-start w-min pl-0' : (hasOtherMenuItems.value ? 'last-of-type:w-full disabled:cursor-pointer disabled:opacity-100' : undefined),
        padding: (!solid && hasOtherMenuItems.value) ? 'last-of-type:p-0' : undefined,
        background: 'bg-transparent'
      },
      marker: {
        wrapper: hasMounted.value ? 'duration-200' : '!duration-0'
      }
    },
  }, ui);
});

const items = computed(() => {
  const visibleTabs = tabs.map(tab => {
    if(has(tab, 'label.slotName')) {
      return {
        disabled: !tab.enabled,
        tab,
        label: ''
      };
    }

    return {
      label: t((tab.label as any).resName),
      icon: (tab.label as any).shortIcon,
      disabled: !tab.enabled,
      tab
    };
  });

  if(hasOtherMenuItems.value) {
    const menuHasActiveItem = !!menu?.variants?.length && menu.variants.some(v => v.isActive);
    const variantLabelResName = menuHasActiveItem ? menu.variants.find(v => v.isActive)!.label.resName : undefined;
    const label = menuHasActiveItem ? t(menu.selectedResName, { variantLabel: t(variantLabelResName!) }) : t(menu!.defaultResName);

    visibleTabs.push({
      label,
      icon: undefined,
      disabled: false,
      tab: {
        ...menu!,
        ctrlKey: OtherSortOptionsTabCtrlKey,
        tabName: OtherSortOptionsTabCtrlKey,
        isActive: menuHasActiveItem,
        label: { slotName: OtherSortOptionsTabNameSlot }
      }
    });
  }

  return visibleTabs;
});

const otherMenuItems = computed(() => {
  return hasOtherMenuItems.value ? 
    menu!.variants.map(v => {
      return {
        value: v.ctrlKey,
        resName: v.label.resName
      };
    }) : [];
});

</script>

<template>
  <UTabs v-model:model-value="selectedTabIndex" :ui="tabsStyling" :items="items">
    <template v-if="slotTabNames || hasOtherMenuItems" #default="{ item: tabItem }">
      <slot v-if="tabItem.tab.label.slotName !== OtherSortOptionsTabNameSlot" :name="tabItem.tab.label.slotName" :tab="tabItem.tab" />
      <div v-else class="w-full h-auto">
        <TabsGroupMenu v-model:model-value="modelValue" :ctrl-key="[...ctrlKey, 'OtherOptions']" :items="otherMenuItems" :label="tabItem.label"/>
      </div>
    </template>
   
    <template #item="{ item: tabItem }">
      <h2 v-if="!solid && !slotTabNames" class="block break-words text-3xl font-semibold text-black dark:text-white">
        {{ tabItem.label }}
      </h2>
      <div v-if="slotTabs">
        <slot :name="tabItem.tab.slotName" />
      </div>
      <div v-else class="w-full h-auto">
        <slot />
      </div>
    </template>
  </UTabs>  
</template>
