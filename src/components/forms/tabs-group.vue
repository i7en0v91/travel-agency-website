<script setup lang="ts">

import { type ITabGroupProps } from '../../types';
import { getLastSelectedTabStorageKey } from '../../helpers/dom';
import { getCommonServices } from '../../helpers/service-accessors';
import has from 'lodash-es/has';
import { mergeConfig } from './../../node_modules/@nuxt/ui/dist/runtime/utils/index';
import TabsGroupMenu from './tabs-group-menu.vue';

const props = defineProps<ITabGroupProps>();

const OtherSortOptionsTabNameSlot = 'other';
const OtherSortOptionsTabCtrlKey = `${props.ctrlKey}-OtherSortOptions`;

const hasMounted = ref(false);

const tabModel = defineModel<string | undefined>('activeTabKey');
const selectedTabIndex = ref<number>();

const logger = getCommonServices().getLogger();
const nuxtApp = useNuxtApp();
const { t } = useI18n();

function saveLastSelectedTab (lastSelectedTab?: string) {
  const storageKey = getLastSelectedTabStorageKey(props.ctrlKey);
  if (lastSelectedTab) {
    logger.debug(`(TabsGroup) saving last active tab: ctrlKey=${props.ctrlKey}, key=${storageKey}, tab=${lastSelectedTab ?? '[empty]'}`);
    localStorage.setItem(storageKey, lastSelectedTab);
  } else {
    logger.debug(`(TabsGroup) removing last active tab: ctrlKey=${props.ctrlKey}, key=${storageKey}`);
    localStorage.removeItem(storageKey);
  }
}

function loadLastSelectedTab (): string | undefined {
  const storageKey = getLastSelectedTabStorageKey(props.ctrlKey);
  logger.debug(`(TabsGroup) loading last selected tab: ctrlKey=${props.ctrlKey}, key=${storageKey}`);
  const result = localStorage.getItem(storageKey) ?? undefined;
  logger.debug(`(TabsGroup) last selected tab loaded: ctrlKey=${props.ctrlKey}, resuilt=${result}`);
  return result;
}

function fireActiveTabChange (newActiveTabKey: string) {
  const currentActiveTabKey = props.activeTabKey;
  if (!currentActiveTabKey || currentActiveTabKey !== newActiveTabKey) {
    logger.debug(`(TabsGroup) firing selected tab change: ctrlKey=${props.ctrlKey}, newActiveTab=${newActiveTabKey}, prevActiveTab=${currentActiveTabKey}`);
    selectedTabIndex.value = props.tabs.findIndex(t => t.ctrlKey === newActiveTabKey) ?? (props.menu && props.menu.variants.some(x => x.ctrlKey === newActiveTabKey) ? props.tabs.length : undefined);
    
    //$emit('update:activeTabKey', newActiveTabKey);
    tabModel.value = newActiveTabKey;
    saveLastSelectedTab(newActiveTabKey);
  }
}

function onSelectedTabChanged (index: number) {
  if(index >= props.tabs.length) {
    const ctrlKey = props.menu?.variants?.find(x => x.ctrlKey === tabModel.value)?.ctrlKey;
    if(!ctrlKey) {
      // KB: currently the only case is when a variant is selected from 
      // dropdown side-menu (other options) which in-turn triggers selected tab index change.
      // Can safely ignore first-time event because it subsequently 
      // gets handled by tab model watch callback
      logger.verbose(`(TabsGroup) received selected tab change event for menu index, but active variant was not found: ctrlKey=${props.ctrlKey}, index=${index}, ctrlKey=${tabModel.value}`);
      //fireActiveTabChange(props.tabs[0].ctrlKey);
      return;
    }
    logger.debug(`(TabsGroup) received selected tab changed event: ctrlKey=${props.ctrlKey}, index=${index}, ctrlKey=${ctrlKey}`);
    fireActiveTabChange(ctrlKey);
  } else {
    const ctrlKey = props.tabs[index].ctrlKey;
    logger.debug(`(TabsGroup) received selected tab changed event: ctrlKey=${props.ctrlKey}, index=${index}, ctrlKey=${ctrlKey}`);
    fireActiveTabChange(ctrlKey);
  }
}

function initActiveTab () {
  if (!props.activeTabKey) {
    logger.debug(`(TabsGroup) initializing selected tab: ctrlKey=${props.ctrlKey}`);
    const savedSelectedTab = loadLastSelectedTab();
    if (savedSelectedTab) {
      logger.debug(`(TabsGroup) last selected tab has been read from storage: ctrlKey=${props.ctrlKey}, tab=${savedSelectedTab}`);
      if (props.tabs.some(x => x.ctrlKey === savedSelectedTab) || props.menu?.variants.some(v => v.ctrlKey === savedSelectedTab)) {
        fireActiveTabChange(savedSelectedTab);
        return;
      } else {
        logger.warn(`(TabsGroup) last selected tab has been read from storage, but respective tab cannot be found: ctrlKey=${props.ctrlKey}, tab=${savedSelectedTab}`);
      }
    }

    const firstEnabledTab = props.tabs.find(o => o.enabled === true && (o.ctrlKey !== OtherSortOptionsTabCtrlKey || props.menu!.variants.some(v => v.enabled)));
    if (firstEnabledTab) {
      if (firstEnabledTab.ctrlKey === OtherSortOptionsTabCtrlKey) {
        const firstEnabledMenuVariant = props.menu!.variants.find(v => v.enabled === true)!;
        logger.debug(`(TabsGroup) setting menu variant active: ctrlKey=${props.ctrlKey}, menuKey=${firstEnabledMenuVariant.ctrlKey}`);
        fireActiveTabChange(firstEnabledMenuVariant.ctrlKey);
      } else {
        logger.debug(`(TabsGroup) setting selected tab: ctrlKey=${props.ctrlKey}, tabKey=${firstEnabledTab.ctrlKey}`);
        fireActiveTabChange(firstEnabledTab.ctrlKey);
      }
    } else {
      logger.verbose(`(TabsGroup) all tabs are disabled, nothing to make active: ctrlKey=${props.ctrlKey}`);
    }
  }
}

function modelValueUpdateHandler() {
  logger.debug(`(TabsGroup) model value update handler, ctrlKey=${props.ctrlKey}, value=${tabModel.value}`);
  let index = props.tabs.findIndex((item) => item.ctrlKey === tabModel.value);
  if(index < 0) {
    if(props.menu?.variants?.some(v => v.ctrlKey === tabModel.value)) {
      index = props.tabs.length;
    }
  }

  if (index < 0) {
    logger.warn(`(TabsGroup) cannot find tab to select, ctrlKey=${props.ctrlKey}, value=${tabModel.value}`);
    index = 0;
  }
  if(selectedTabIndex.value != index) {
    logger.debug(`(TabsGroup) selected tab index changed via model value, ctrlKey=${props.ctrlKey}, new=${index}, prev=${selectedTabIndex.value}`);
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
  watch(() => [props.menu?.variants?.length ?? 0, props.tabs?.length ?? 0], modelValueUpdateHandler, { immediate: false });
  setTimeout(() => {
    hasMounted.value = true;
    modelValueUpdateHandler();
  }, 0);
});

const solid = (props.variant ?? 'solid') === 'solid';
const slotTabNames = props.tabs.some(ti => has(ti, 'label.slotName'));

const hasOtherMenuItems = computed(() => !!props.menu?.variants?.length);

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
  }, props.ui);
});

const items = computed(() => {
  const visibleTabs = props.tabs.map(tab => {
    if(has(tab, 'label.slotName')) {
      return {
        disabled: !tab.enabled,
        tab
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
    const menuHasActiveItem = !!props.menu?.variants?.length && props.menu.variants.some(v => v.isActive);
    const variantLabelResName = menuHasActiveItem ? props.menu.variants.find(v => v.isActive)!.label.resName : undefined;
    const label = menuHasActiveItem ? t(props.menu.selectedResName, { variantLabel: t(variantLabelResName!) }) : t(props.menu!.defaultResName);

    visibleTabs.push({
      label,
      icon: undefined,
      disabled: true,
      tab: {
        ...props.menu!,
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
    props.menu!.variants.map(v => {
      return {
        value: v.ctrlKey,
        resName: v.label.resName
      };
    }) : [];
});

</script>

<template>
  <UTabs v-model="selectedTabIndex" :ui="tabsStyling" :items="items" @change="onSelectedTabChanged">
    <template v-if="slotTabNames || hasOtherMenuItems" #default="{ item: tabItem }">
      <slot v-if="tabItem.tab.label.slotName !== OtherSortOptionsTabNameSlot" :name="tabItem.tab.label.slotName" :tab="tabItem.tab" />
      <div v-else class="w-full h-auto">
        <TabsGroupMenu v-model:model-value="tabModel" :ctrl-key="`${props.ctrlKey}-Menu`" :items="otherMenuItems" :label="tabItem.label"/>
      </div>
    </template>
   
    <template #item="{ item: tabItem }">
      <h2 v-if="!solid && !slotTabNames" class="block break-words text-3xl font-semibold text-black dark:text-white">
        {{ tabItem.label }}
      </h2>
      <div class="w-full h-auto">
        <slot />
      </div>
    </template>
  </UTabs>  
</template>
