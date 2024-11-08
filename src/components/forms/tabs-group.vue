<script setup lang="ts">
import { type ITabGroupProps } from '../../types';
import { getLastSelectedTabStorageKey } from '../../helpers/dom';
import { getCommonServices } from '../../helpers/service-accessors';

const props = withDefaults(defineProps<ITabGroupProps>(), {
  useAdaptiveButtonWidth: false
});

const hasMounted = ref(false);

defineModel<string | undefined>('activeTabKey', { 
  required: false,
  get() {
    return props.tabs[selectedTabIndex.value ?? 0].ctrlKey;
  },
  set(value) {
    let index = props.tabs.findIndex((item) => item.ctrlKey === value);
    if (index < 0) {
      logger.warn(`(TabsGroup) cannot find tab to select, ctrlKey=${value}`);
      index = 0;
    }
    selectedTabIndex.value = index;
  }
});
const selectedTabIndex = ref<number>();

const $emit = defineEmits<{(event: 'update:activeTabKey', newActiveTabKey: string, prevActiveTabKey?: string): void}>();

const logger = getCommonServices().getLogger();
const nuxtApp = useNuxtApp();
const { t } = useI18n();

function saveLastSelectedTab (lastSelectedTab?: string) {
  const storageKey = getLastSelectedTabStorageKey(props.ctrlKey);
  if (lastSelectedTab) {
    logger.debug(`(TabsGroup) saving last active tab: groupKey=${props.ctrlKey}, key=${storageKey}, tab=${lastSelectedTab ?? '[empty]'}`);
    localStorage.setItem(storageKey, lastSelectedTab);
  } else {
    logger.debug(`(TabsGroup) removing last active tab: groupKey=${props.ctrlKey}, key=${storageKey}`);
    localStorage.removeItem(storageKey);
  }
}

function loadLastSelectedTab (): string | undefined {
  const storageKey = getLastSelectedTabStorageKey(props.ctrlKey);
  logger.debug(`(TabsGroup) loading last selected tab: groupKey=${props.ctrlKey}, key=${storageKey}`);
  const result = localStorage.getItem(storageKey) ?? undefined;
  logger.debug(`(TabsGroup) last selected tab loaded: groupKey=${props.ctrlKey}, resuilt=${result}`);
  return result;
}

function fireActiveTabChange (newActiveTabKey: string) {
  const currentActiveTabKey = props.activeTabKey;
  if (!currentActiveTabKey || currentActiveTabKey !== newActiveTabKey) {
    logger.debug(`(TabsGroup) firing selected tab change: groupKey=${props.ctrlKey}, newActiveTab=${newActiveTabKey}, prevActiveTab=${currentActiveTabKey}`);
    selectedTabIndex.value = props.tabs.findIndex(t => t.ctrlKey === newActiveTabKey);
    $emit('update:activeTabKey', newActiveTabKey);
    saveLastSelectedTab(newActiveTabKey);
  }
}

function onSelectedTabChanged (index: number) {
  const ctrlKey = props.tabs[index].ctrlKey;
  logger.debug(`(TabsGroup) received selected tab changed event: groupKey=${props.ctrlKey}, index=${index}, ctrlKey=${ctrlKey}`);
  fireActiveTabChange(ctrlKey);
}

function initActiveTab () {
  if (!props.activeTabKey) {
    logger.debug(`(TabsGroup) initializing selected tab: groupKey=${props.ctrlKey}`);
    const savedSelectedTab = loadLastSelectedTab();
    if (savedSelectedTab) {
      logger.debug(`(TabsGroup) last selected tab has been read from storage: groupKey=${props.ctrlKey}, tab=${savedSelectedTab}`);
      if (props.tabs.some(x => x.ctrlKey === savedSelectedTab) || props.menu?.variants.some(v => v.ctrlKey === savedSelectedTab)) {
        fireActiveTabChange(savedSelectedTab);
        return;
      } else {
        logger.warn(`(TabsGroup) last selected tab has been read from storage, but respective tab cannot be found: groupKey=${props.ctrlKey}, tab=${savedSelectedTab}`);
      }
    }

    const firstEnabledTab = props.tabs.find(o => o.enabled === true && (o.ctrlKey !== props.menu?.ctrlKey || props.menu!.variants.some(v => v.enabled)));
    if (firstEnabledTab) {
      if (firstEnabledTab.ctrlKey === props.menu?.ctrlKey) {
        const firstEnabledMenuVariant = props.menu!.variants.find(v => v.enabled === true)!;
        logger.debug(`(TabsGroup) setting menu variant active: groupKey=${props.ctrlKey}, menuKey=${firstEnabledMenuVariant.ctrlKey}`);
        fireActiveTabChange(firstEnabledMenuVariant.ctrlKey);
      } else {
        logger.debug(`(TabsGroup) setting selected tab: groupKey=${props.ctrlKey}, tabKey=${firstEnabledTab.ctrlKey}`);
        fireActiveTabChange(firstEnabledTab.ctrlKey);
      }
    } else {
      logger.verbose(`(TabsGroup) all tabs are disabled, nothing to make active: groupKey=${props.ctrlKey}`);
    }
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
  setTimeout(() => {
    hasMounted.value = true;
  }, 0);
});

const tabsStyling = computed(() => {
  return { 
    container: '!mt-8',
    list: {
      base: props.ui?.compactTabs ? 'gap-4 sm:gap-6' : undefined,
      padding: props.ui?.compactTabs ? '!pl-0' : 'px-4 sm:px-6',
      width: props.ui?.compactTabs ? 'w-auto' : undefined,
      tab: { 
        base: props.ui?.compactTabs ? 'justify-start w-min pl-0' : undefined
      },
      marker: {
        wrapper: hasMounted.value ? 'duration-200' : '!duration-0'
      }
    },
  };
});

const items = computed(() => {
  return props.tabs.map(tab => {
    return {
      label: t(tab.labelResName),
      icon: tab.shortIcon,
      disabled: !tab.enabled,
      tab
    };
  });
});

</script>

<template>
  <UTabs v-model="selectedTabIndex" :ui="tabsStyling" :items="items" class="w-full" @change="onSelectedTabChanged">
    <template #item="{ item: tabItem }">
      <slot :tab="tabItem.tab"/>
    </template>
  </UTabs>  
</template>
