<script setup lang="ts">
import { getCommonServices } from '../../helpers/service-accessors';
import { type IAccordionProps } from '../../types';
import type { UAccordion } from '../../.nuxt/components';
import { type ComponentInstance } from 'vue';

const props = withDefaults(defineProps<IAccordionProps>(), {
  persistent: true
});

const defaultOpenSettings = ref(props.items.map(() => { return { open: true }; }));
const accordionRef = shallowRef<ComponentInstance<typeof UAccordion> | undefined>();

const controlSettingsStore = useControlSettingsStore();

const logger = getCommonServices().getLogger();
const { t } = useI18n();


const getButtonSettingsName = (slotName: string): string => `${props.ctrlKey}-${slotName}-collapsed`;

function saveToggledStatesToSettings(states: { open: boolean }[]) {
  logger.verbose(`(MyAccordion) saving toggled states, ctrlKey=${props.ctrlKey}, count=${states.length}`);

  if(states.length !== props.items.length) {
    logger.warn(`(MyAccordion) cannot save toggled states to settings, length differs, ctrlKey=${props.ctrlKey}, count=${states.length}, items=${JSON.stringify(props.items)}`);
    return;
  }

  try {
    for(let i = 0; i < props.items.length; i++) {
      const settingsName = getButtonSettingsName(props.items[i].slotName);
      const isCollapsed = !states[i].open;
      const settings = controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(settingsName, 'expanded', true);
      settings.value = isCollapsed ? 'collapsed' : 'expanded';
    }

    logger.verbose(`(MyAccordion) toggled states saved, ctrlKey=${props.ctrlKey}, count=${states.length}`);
  } catch(err: any) {
    logger.warn(`(MyAccordion) failed to save toggled states to settings, ctrlKey=${props.ctrlKey}, count=${states.length}, items=${JSON.stringify(props.items)}`);
  }
}

function readToggledStatesFromSettings(): { open: boolean }[] {
  logger.verbose(`(MyAccordion) reading toggled states, ctrlKey=${props.ctrlKey}, count=${props.items.length}`);

  const result: { open: boolean }[] = [];

  try {
    for(let i = 0; i < props.items.length; i++) {
      const settingsName = getButtonSettingsName(props.items[i].slotName);
      const settings = controlSettingsStore.getControlValueSetting<'collapsed' | 'expanded' | undefined>(settingsName, 'expanded', true);
      const open = settings.value === 'expanded';
      result.push({ open });
    }

    logger.verbose(`(MyAccordion) toggled states have been read, ctrlKey=${props.ctrlKey}, count=${result.length}`);
    return result; 
  } catch(err: any) {
    logger.warn(`(MyAccordion) failed to read toggled states from settings, ctrlKey=${props.ctrlKey}, items=${JSON.stringify(props.items)}`);
    return props.items.map(() => { return { open: true }; });
  }
}

onBeforeMount(() => {
  if(props.persistent) {
    defaultOpenSettings.value = readToggledStatesFromSettings();
  }
});

onMounted(() => {
  const togglers = accordionRef.value.buttonRefs as { open: boolean }[];
  
  logger.debug(`(MyAccordion) tracking toggler buttons states, ctrlKey=${props.ctrlKey}, count=${togglers.length}`);
  if(props.persistent) {
    watch(accordionRef.value.buttonRefs, saveToggledStatesToSettings, { immediate: false });
  }
});

const items = computed(() => {
  return props.items.map((item, idx) => {
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
  <UAccordion ref="accordionRef" :items="items" multiple>
    <template
      v-for="(item) in items"
      #[item.slot]
      :key="`${props.ctrlKey}-Item-${item.slot}`">
  
      <slot :name="item.slot" />
    </template>
  </UAccordion>
</template>
