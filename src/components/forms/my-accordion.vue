<script setup lang="ts">
import { getCommonServices } from '../../helpers/service-accessors';
import type { IAccordionProps } from '../../types';
import type { UAccordion } from '../../.nuxt/components';

const { ctrlKey, items, persistent = true } = defineProps<IAccordionProps>();

const defaultOpenSettings = ref(items.map(() => { return { open: true }; }));
const accordionRef = useTemplateRef('accordion');

const controlSettingsStore = useControlSettingsStore();

const logger = getCommonServices().getLogger();
const { t } = useI18n();


const getButtonSettingsName = (slotName: string): string => `${ctrlKey}-${slotName}-collapsed`;

function saveToggledStatesToSettings(states: { open: boolean }[]) {
  logger.verbose(`(MyAccordion) saving toggled states, ctrlKey=${ctrlKey}, count=${states.length}`);

  if(states.length !== items.length) {
    logger.warn(`(MyAccordion) cannot save toggled states to settings, length differs, ctrlKey=${ctrlKey}, count=${states.length}, items=${JSON.stringify(items)}`);
    return;
  }

  try {
    for(let i = 0; i < items.length; i++) {
      const settingsName = getButtonSettingsName(items[i].slotName);
      const isCollapsed = !states[i].open;
      const settings = controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(settingsName, 'expanded', true);
      settings.value = isCollapsed ? 'collapsed' : 'expanded';
    }

    logger.verbose(`(MyAccordion) toggled states saved, ctrlKey=${ctrlKey}, count=${states.length}`);
  } catch(err: any) {
    logger.warn(`(MyAccordion) failed to save toggled states to settings, ctrlKey=${ctrlKey}, count=${states.length}, items=${JSON.stringify(items)}`, err);
  }
}

function readToggledStatesFromSettings(): { open: boolean }[] {
  logger.verbose(`(MyAccordion) reading toggled states, ctrlKey=${ctrlKey}, count=${items.length}`);

  const result: { open: boolean }[] = [];

  try {
    for(let i = 0; i < items.length; i++) {
      const settingsName = getButtonSettingsName(items[i].slotName);
      const settings = controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(settingsName, 'expanded', true);
      const open = settings.value === 'expanded';
      result.push({ open });
    }

    logger.verbose(`(MyAccordion) toggled states have been read, ctrlKey=${ctrlKey}, count=${result.length}`);
    return result; 
  } catch(err: any) {
    logger.warn(`(MyAccordion) failed to read toggled states from settings, ctrlKey=${ctrlKey}, items=${JSON.stringify(items)}`, err);
    return items.map(() => { return { open: true }; });
  }
}

onBeforeMount(() => {
  if(persistent) {
    defaultOpenSettings.value = readToggledStatesFromSettings();
  }
});

onMounted(() => {
  const togglers = accordionRef.value?.buttonRefs as { open: boolean }[];
  
  logger.debug(`(MyAccordion) tracking toggler buttons states, ctrlKey=${ctrlKey}, count=${togglers.length}`);
  if(persistent) {
    watch(accordionRef.value!.buttonRefs!, saveToggledStatesToSettings, { immediate: false });
  }
});

const labeledItems = computed(() => {
  return items.map((item, idx) => {
    return {
      label: t(item.labelResName),
      icon: item.icon,
      defaultOpen: defaultOpenSettings.value[idx].open,
      slot: item.slotName,
      closeOthers: false
    };
  });
});

</script>

<template>
  <UAccordion ref="accordion" :items="labeledItems" multiple>
    <template
      v-for="(item) in labeledItems"
      #[item.slot]
      :key="`${ctrlKey}-Item-${item.slot}`">
  
      <slot :name="item.slot" />
    </template>
  </UAccordion>
</template>
