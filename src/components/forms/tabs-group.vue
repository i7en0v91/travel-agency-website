<script setup lang="ts">

import type { ITabGroupProps } from '../../types';
import { getLastSelectedTabStorageKey } from '../../helpers/dom';
import { getCommonServices } from '../../helpers/service-accessors';
import has from 'lodash-es/has';
import { mergeConfig } from './../../node_modules/@nuxt/ui/dist/runtime/utils/index';
import TabsGroupMenu from './tabs-group-menu.vue';

const { ctrlKey, activeTabKey, tabs, menu, variant, ui } = defineProps<ITabGroupProps>();

const OtherSortOptionsTabNameSlot = 'other';
const OtherSortOptionsTabCtrlKey = `${ctrlKey}-OtherSortOptions`;

const hasMounted = ref(false);

const tabModel = defineModel<string | undefined>('activeTabKey');
const selectedTabIndex = ref<number>();

const logger = getCommonServices().getLogger();
const nuxtApp = useNuxtApp();
const { t } = useI18n();

function saveLastSelectedTab (lastSelectedTab?: string) {
  const storageKey = getLastSelectedTabStorageKey(ctrlKey);
  if (lastSelectedTab) {
    logger.debug(`(TabsGroup) saving last active tab: ctrlKey=${ctrlKey}, key=${storageKey}, tab=${lastSelectedTab ?? '[empty]'}`);
    localStorage.setItem(storageKey, lastSelectedTab);
  } else {
    logger.debug(`(TabsGroup) removing last active tab: ctrlKey=${ctrlKey}, key=${storageKey}`);
    localStorage.removeItem(storageKey);
  }
}

function loadLastSelectedTab (): string | undefined {
  const storageKey = getLastSelectedTabStorageKey(ctrlKey);
  logger.debug(`(TabsGroup) loading last selected tab: ctrlKey=${ctrlKey}, key=${storageKey}`);
  const result = localStorage.getItem(storageKey) ?? undefined;
  logger.debug(`(TabsGroup) last selected tab loaded: ctrlKey=${ctrlKey}, resuilt=${result}`);
  return result;
}

function fireActiveTabChange (newActiveTabKey: string) {
  const currentActiveTabKey = activeTabKey;
  if (!currentActiveTabKey || currentActiveTabKey !== newActiveTabKey) {
    logger.debug(`(TabsGroup) firing selected tab change: ctrlKey=${ctrlKey}, newActiveTab=${newActiveTabKey}, prevActiveTab=${currentActiveTabKey}`);
    selectedTabIndex.value = tabs.findIndex(t => t.ctrlKey === newActiveTabKey) ?? (menu && menu.variants.some(x => x.ctrlKey === newActiveTabKey) ? tabs.length : undefined);
    
    tabModel.value = newActiveTabKey;
    saveLastSelectedTab(newActiveTabKey);
  }
}

function onSelectedTabChanged (index: number) {
  if(index >= tabs.length) {
    const ctrlKey = menu?.variants?.find(x => x.ctrlKey === tabModel.value)?.ctrlKey;
    if(!ctrlKey) {
      // KB: currently the only case is when a variant is selected from 
      // dropdown side-menu (other options) which in-turn triggers selected tab index change.
      // Can safely ignore first-time event because it subsequently 
      // gets handled by tab model watch callback
      logger.verbose(`(TabsGroup) received selected tab change event for menu index, but active variant was not found: ctrlKey=${ctrlKey}, index=${index}, ctrlKey=${tabModel.value}`);
      //fireActiveTabChange(props.tabs[0].ctrlKey);
      return;
    }
    logger.debug(`(TabsGroup) received selected tab changed event: ctrlKey=${ctrlKey}, index=${index}, ctrlKey=${ctrlKey}`);
    fireActiveTabChange(ctrlKey);
  } else {
    const ctrlKey = tabs[index].ctrlKey;
    logger.debug(`(TabsGroup) received selected tab changed event: ctrlKey=${ctrlKey}, index=${index}, ctrlKey=${ctrlKey}`);
    fireActiveTabChange(ctrlKey);
  }
}

function initActiveTab () {
  if (!activeTabKey) {
    logger.debug(`(TabsGroup) initializing selected tab: ctrlKey=${ctrlKey}`);
    const savedSelectedTab = loadLastSelectedTab();
    if (savedSelectedTab) {
      logger.debug(`(TabsGroup) last selected tab has been read from storage: ctrlKey=${ctrlKey}, tab=${savedSelectedTab}`);
      if (tabs.some(x => x.ctrlKey === savedSelectedTab) || menu?.variants.some(v => v.ctrlKey === savedSelectedTab)) {
        fireActiveTabChange(savedSelectedTab);
        return;
      } else {
        logger.warn(`(TabsGroup) last selected tab has been read from storage, but respective tab cannot be found: ctrlKey=${ctrlKey}, tab=${savedSelectedTab}`);
      }
    }

    const firstEnabledTab = tabs.find(o => o.enabled === true && (o.ctrlKey !== OtherSortOptionsTabCtrlKey || menu!.variants.some(v => v.enabled)));
    if (firstEnabledTab) {
      if (firstEnabledTab.ctrlKey === OtherSortOptionsTabCtrlKey) {
        const firstEnabledMenuVariant = menu!.variants.find(v => v.enabled === true)!;
        logger.debug(`(TabsGroup) setting menu variant active: ctrlKey=${ctrlKey}, menuKey=${firstEnabledMenuVariant.ctrlKey}`);
        fireActiveTabChange(firstEnabledMenuVariant.ctrlKey);
      } else {
        logger.debug(`(TabsGroup) setting selected tab: ctrlKey=${ctrlKey}, tabKey=${firstEnabledTab.ctrlKey}`);
        fireActiveTabChange(firstEnabledTab.ctrlKey);
      }
    } else {
      logger.verbose(`(TabsGroup) all tabs are disabled, nothing to make active: ctrlKey=${ctrlKey}`);
    }
  }
}

function modelValueUpdateHandler() {
  logger.debug(`(TabsGroup) model value update handler, ctrlKey=${ctrlKey}, value=${tabModel.value}`);
  if(!hasMounted.value) {
    logger.debug(`(TabsGroup) ignoring model value update handler, not mounted, ctrlKey=${ctrlKey}, value=${tabModel.value}`);
    return;
  }

  let index = tabs.findIndex((item) => item.ctrlKey === tabModel.value);
  if(index < 0) {
    if(menu?.variants?.some(v => v.ctrlKey === tabModel.value)) {
      index = tabs.length;
    }
  }

  if (index < 0) {
    logger.warn(`(TabsGroup) cannot find tab to select, ctrlKey=${ctrlKey}, value=${tabModel.value}`);
    index = 0;
  }
  if(selectedTabIndex.value != index) {
    logger.debug(`(TabsGroup) selected tab index changed via model value, ctrlKey=${ctrlKey}, new=${index}, prev=${selectedTabIndex.value}`);
    selectedTabIndex.value = index;
  }
}

onBeforeMount(() => {
  if(nuxtApp.isHydrating) {
    setTimeout(() => {
      initActiveTab();
    }, 0);
  } else {
    initActiveTab();
  }
});

onMounted(() => {
  watch(tabModel, modelValueUpdateHandler, { immediate: false });
  watch(() => [menu?.variants?.length ?? 0, tabs?.length ?? 0], modelValueUpdateHandler, { immediate: false });
  setTimeout(() => {
    hasMounted.value = true;
    modelValueUpdateHandler();
  }, 0);
});

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
      disabled: true,
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
  <UTabs v-model:model-value="selectedTabIndex" :ui="tabsStyling" :items="items" @change="onSelectedTabChanged">
    <template v-if="slotTabNames || hasOtherMenuItems" #default="{ item: tabItem }">
      <slot v-if="tabItem.tab.label.slotName !== OtherSortOptionsTabNameSlot" :name="tabItem.tab.label.slotName" :tab="tabItem.tab" />
      <div v-else class="w-full h-auto">
        <TabsGroupMenu v-model:model-value="tabModel" :ctrl-key="`${ctrlKey}-Menu`" :items="otherMenuItems" :label="tabItem.label"/>
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
