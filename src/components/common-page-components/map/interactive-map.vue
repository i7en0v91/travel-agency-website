<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppConfig, type GeoPoint, type EntityDataAttrsOnly, type ICity, getI18nResName2, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  origin: GeoPoint,
  styleClass?: string,
  webUrl?: string,
  city?: EntityDataAttrsOnly<ICity>
}

const { ctrlKey, origin } = defineProps<IProps>();

const { locale } = useI18n();
const logger = getCommonServices().getLogger().addContextProps({ component: 'InteractiveMap' });
const isError = ref(false);

const $emit = defineEmits(['update:webUrl']);

function onWebUrlChange (value: string) {
  logger.verbose('web url changed', { ctrlKey, value });
  $emit('update:webUrl', value);
}

function onMapError (err: any) {
  logger.warn('got exception from map component', err, ctrlKey);
  isError.value = true;
}

const MapComponent = AppConfig.maps ? resolveComponent(AppConfig.maps.mapControlComponentName) : undefined;

</script>

<template>
  <div>
    <ClientOnly v-if="!!AppConfig.maps">
      <ErrorHelm v-model:is-error="isError">
        <div class="rounded-2xl overflow-hidden">
          <component
            :is="MapComponent"
            :style-class="styleClass"
            :origin="origin"
            :ctrl-key="[...ctrlKey, 'InteractiveMap']"
            @update:web-url="onWebUrlChange"
            @onerror="onMapError"
          />
        </div>
      </ErrorHelm>
      <div class="w-full h-auto mt-2 flex flex-row flex-nowrap gap-2 items-center">
        <UIcon name="i-material-symbols-location-on-rounded" class="w-4 h-4 inline-block opacity-70"/>
        <span v-if="city" class="text-xs text-gray-600 dark:text-gray-300 whitespace-normal">
          {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
        </span>
        <USkeleton v-else class="w-10 h-3" />
      </div>
      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'InteractiveMap', 'ClientFallback']" class="mt-8" />
      </template>
    </ClientOnly>
    <div v-else class="w-full h-auto whitespace-normal text-gray-600 dark:text-gray-300">
      {{ $t(getI18nResName2('maps', 'disabled')) }}
    </div>
  </div>
</template>
