<script setup lang="ts">
import { toShortForm, type ControlKey, type ArbitraryControlElementMarker } from './../../helpers/components';
import { getCommonServices } from '../../helpers/service-accessors';
import type { IAccordionProps } from '../../types';
import type { UAccordion } from '../../.nuxt/components';
import { useControlValuesStore } from '../../stores/control-values-store';

const { 
  ctrlKey, 
  items, 
  persistent = true 
} = defineProps<IAccordionProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'MyAccordion' });
const controlValuesStore = useControlValuesStore();
const { t } = useI18n();

const accordionRef = useTemplateRef('accordion');

function getButtonToggledValueKey(slotName: string): ControlKey {
  return [...ctrlKey, slotName as ArbitraryControlElementMarker, 'Accordion'];
};

async function saveToggledStatesToSettings(states: { open: boolean }[]): Promise<void> {
  logger.verbose('saving toggled states', { ctrlKey, count: states.length });

  if(states.length !== items.length) {
    logger.warn('cannot save toggled states to settings, length differs', undefined, { ctrlKey, count: states.length, items });
    return;
  }

  try {
    for(let i = 0; i < items.length; i++) {
      const settingsName = getButtonToggledValueKey(items[i].slotName);
      const isExpanded = states[i].open;
      await controlValuesStore.setValue<boolean>(settingsName, isExpanded);
    }

    logger.verbose('toggled states saved', { ctrlKey, count: states.length });
  } catch(err: any) {
    logger.warn('failed to save toggled states to settings', err, { ctrlKey, count: states.length, items });
  }
}

async function readToggledStatesFromSettings(): Promise<{ open: boolean }[]> {
  logger.verbose('reading toggled states', { ctrlKey, count: items.length });

  const result: { open: boolean }[] = [];

  try {
    for(let i = 0; i < items.length; i++) {
      const valueKey = getButtonToggledValueKey(items[i].slotName);
      const open = await controlValuesStore.getValue<boolean>(valueKey);
      result.push({ open });
    }

    logger.verbose('toggled states have been read', { ctrlKey, count: result.length });
    return result; 
  } catch(err: any) {
    logger.warn('failed to read toggled states from settings', err, { ctrlKey, items });
    return items.map(() => { return { open: true }; });
  }
}

onMounted(() => {
  const togglers = accordionRef.value?.buttonRefs as { open: boolean }[];
  
  logger.debug('tracking toggler buttons states', { ctrlKey, count: togglers.length });
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

const defaultOpenSettings = ref(items.map(() => { return { open: true }; }));
if(import.meta.client) {
  if(persistent) {
    defaultOpenSettings.value = await readToggledStatesFromSettings();
  }
}

</script>

<template>
  <UAccordion ref="accordion" :items="labeledItems" multiple>
    <template
      v-for="(item) in labeledItems"
      #[item.slot]
      :key="`${toShortForm(ctrlKey)}-Item-${item.slot}`">
      <slot :name="item.slot" />
    </template>
  </UAccordion>
</template>
