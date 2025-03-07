<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { getI18nResName1, getI18nResName2, StaysMinRoomsCount, StaysMaxRoomsCount, StaysMinGuestsCount, StaysMaxGuestsCount } from '@golobe-demo/shared';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useControlValuesStore } from './../../../stores/control-values-store';

interface IStayParams {
  numRooms: number,
  numGuests: number
}

interface IProps {
  ctrlKey: ControlKey,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { ctrlKey } = defineProps<IProps>();

const modelRef = defineModel<IStayParams | undefined>('params');
const hasMounted = ref(false);
const open = ref(false);

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchStayParams' });
const controlValuesStore = useControlValuesStore();

const numRooms = ref<number | undefined>();
const numGuests = ref<number | undefined>();

const { t } = useI18n();

const displayText = import.meta.client ? (
  controlValuesStore.acquireValuesView(
    (numRoomsRef, numGuestsRef) => {
      if(!hasMounted.value) {
        return '';
      }

      const numRooms = numRoomsRef.value as number;
      const numGuests = numGuestsRef.value as number;
      if([numRooms, numGuests].some(v => v === undefined || v === null)) {
        return '';
      }

      const numRoomsText = `${numRooms} ${t(getI18nResName2('searchStays', 'numRooms'), numRooms)}`;
      const numGuestsText = `${numGuests} ${t(getI18nResName2('searchStays', 'numGuests'), numGuests)}`;

      return `${numRoomsText}, ${numGuestsText}`;
    }, 
    [...ctrlKey, 'Guests', 'Counter'],
    [...ctrlKey, 'Rooms', 'Counter']
  )
) : computed(() => '');

onMounted(() => {
  watch([numRooms, numGuests], () => {
    logger.debug('search params watch handler', ctrlKey);
    modelRef.value = {
      numRooms: numRooms.value ?? modelRef.value?.numRooms ?? StaysMinRoomsCount,
      numGuests: numGuests.value ?? modelRef.value?.numGuests ?? StaysMinGuestsCount
    };
  }, { immediate: true });

  hasMounted.value = true;  
});

defineShortcuts({
  'ESCAPE': () => open.value = false
});

</script>

<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom' }" :class="ui?.wrapper">
    <InputFieldFrame :text-res-name="getI18nResName2('searchStays', 'roomsGuestsCaption')" class="w-full">
      <UButton size="md" :class="`justify-between flex-row-reverse cursor-pointer dark:hover:bg-transparent w-full pl-[16px] ${ui?.input ?? ''}`" variant="outline" color="gray">
        <UIcon name="i-heroicons-chevron-right-20-solid" class="w-5 h-5 text-gray-400 dark:text-gray-500 rotate-90"/>
        <span class="overflow-hidden line-clamp-1 text-wrap text-start">{{ displayText }}</span>       
      </UButton>
    </InputFieldFrame>
    <template #panel="{ close }">
      <div class="w-full p-4">
        <SearchOffersCounter
          v-model:value="numRooms"
          :ctrl-key="[...ctrlKey, 'Rooms', 'Counter']"
          :default-value="StaysMinRoomsCount"
          :min-value="StaysMinRoomsCount"
          :max-value="StaysMaxRoomsCount"
          :label-res-name="getI18nResName2('searchStays', 'numberOfRooms')"
        />
        <SearchOffersCounter
          v-model:value="numGuests"
          :ctrl-key="[...ctrlKey, 'Guests', 'Counter']"
          class="mt-4"
          :default-value="StaysMinGuestsCount"
          :min-value="StaysMinGuestsCount"
          :max-value="StaysMaxGuestsCount"
          :label-res-name="getI18nResName2('searchStays', 'numberOfGuests')"
        />
        <UButton
          class="mt-6 w-full justify-center"
          size="md"
          color="primary"
          variant="solid"
          @click="close"
        >
          {{  $t(getI18nResName1('close')) }}
        </UButton>
      </div>
    </template>
  </UPopover>  
</template>
