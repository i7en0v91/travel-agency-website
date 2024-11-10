<script setup lang="ts">
import { getI18nResName1, getI18nResName2, getI18nResName3, StaysMinRoomsCount, StaysMaxRoomsCount, StaysMinGuestsCount, StaysMaxGuestsCount } from '@golobe-demo/shared';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IStayParams {
  numRooms: number,
  numGuests: number
}

interface IProps {
  ctrlKey: string,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const props = defineProps<IProps>();

const modelRef = defineModel<IStayParams | null | undefined>('params');
const hasMounted = ref(false);
const open = ref(false);

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const roomsValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(`${props.ctrlKey}-Rooms`, StaysMinRoomsCount.toString(), true);
const guestsValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(`${props.ctrlKey}-Guests`, StaysMinGuestsCount.toString(), true);

const numRooms = ref<number | undefined>();
const numGuests = ref<number | undefined>();

const { t } = useI18n();

function saveInitialValuesToSettingsIfNotEmpty () {
  const initiallySelectedParams = modelRef.value;
  if (initiallySelectedParams) {
    roomsValueSetting.value = initiallySelectedParams.numRooms.toString();
    guestsValueSetting.value = initiallySelectedParams.numGuests.toString();
  } else if (initiallySelectedParams === null) {
    roomsValueSetting.value = StaysMinRoomsCount.toString();
    guestsValueSetting.value = StaysMinGuestsCount.toString();
  }
}

function readParamsFromSettings(): IStayParams {
  logger.debug(`(SearchStayParams) parsing params from settings, ctrlKey=${props.ctrlKey}`);
  let numRooms = StaysMinRoomsCount;
  if(roomsValueSetting.value?.length) {
    try {
      numRooms = parseInt(roomsValueSetting.value);
      if(numRooms === undefined || numRooms === null) {
        logger.warn(`(SearchStayParams) parsing num rooms from settings resulted into empty number, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(roomsValueSetting.value)}]`);
        numRooms = StaysMinRoomsCount;
      }
    } catch(err: any) {
      logger.warn(`(SearchStayParams) failed to parse num rooms from settings, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(roomsValueSetting.value)}]`, err);
    }    
  }

  let numGuests = StaysMinGuestsCount;
  if(guestsValueSetting.value?.length) {
    try {
      numGuests = parseInt(guestsValueSetting.value);
      if(numGuests === undefined || numGuests === null) {
        logger.warn(`(SearchStayParams) parsing num guests from settings resulted into empty number, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(guestsValueSetting.value)}]`);
        numGuests = StaysMinGuestsCount;
      }
    } catch(err: any) {
      logger.warn(`(SearchStayParams) failed to parse num guests from settings, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(guestsValueSetting.value)}]`, err);
    }    
  }

  const result = {
    numRooms,
    numGuests
  };
  logger.debug(`(SearchStayParams) params parsed from settings, ctrlKey=${props.ctrlKey}, result=${JSON.stringify(result)}`);
  return result;
}

const displayText = computed(() => {
  if (!hasMounted.value) {
    return '';
  }

  const numRoomsText = `${numRooms.value} ${t(getI18nResName2('searchStays', 'numRooms'), numRooms.value!)}`;
  const numGuestsText = `${numGuests.value} ${t(getI18nResName2('searchStays', 'numGuests'), numGuests.value!)}`;

  return `${numRoomsText}, ${numGuestsText}`;
});


function updateParams (params: IStayParams) {
  logger.verbose(`(SearchStayParams) updating params: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
  roomsValueSetting.value = (params.numRooms ?? StaysMinRoomsCount).toString();
  guestsValueSetting.value = (params.numGuests ?? StaysMinGuestsCount).toString();
  modelRef.value = params;
  logger.verbose(`(SearchStayParams) selected params updated: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
}

function onParamsChange () {
  updateParams({
    numRooms: numRooms.value ?? modelRef.value?.numRooms ?? StaysMinRoomsCount,
    numGuests: numGuests.value ?? modelRef.value?.numGuests ?? StaysMinGuestsCount
  });
}

onBeforeMount(() => {
  saveInitialValuesToSettingsIfNotEmpty();
  const stayParams = readParamsFromSettings();
  numRooms.value = stayParams.numRooms;
  numGuests.value = stayParams.numGuests;
  updateParams(stayParams);
});

onMounted(() => {
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
        <UIcon name="i-heroicons-chevron-right-20-solid" class="w-5 h-5 transition-transform text-gray-400 dark:text-gray-500 rotate-90"/>
        {{ displayText }}       
      </UButton>
    </InputFieldFrame>
    <template #panel="{ close }">
      <div class="w-full p-4">
        <SearchOffersCounter
          v-model:value="numRooms"
          :ctrl-key="`${ctrlKey}-Rooms`"
          :default-value="StaysMinRoomsCount"
          :min-value="StaysMinRoomsCount"
          :max-value="StaysMaxRoomsCount"
          :label-res-name="getI18nResName2('searchStays', 'numberOfRooms')"
          @update:value="onParamsChange"
        />
        <SearchOffersCounter
          v-model:value="numGuests"
          :ctrl-key="`${ctrlKey}-Guests`"
          class="mt-4"
          :default-value="StaysMinGuestsCount"
          :min-value="StaysMinGuestsCount"
          :max-value="StaysMaxGuestsCount"
          :label-res-name="getI18nResName2('searchStays', 'numberOfGuests')"
          @update:value="onParamsChange"
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
