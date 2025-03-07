<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppConfig, type GeoPoint, type EntityDataAttrsOnly, type ICity, getI18nResName2, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  origin: GeoPoint,
  cssClass?: string,
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
  <div class="interactive-map">
    <ClientOnly v-if="!!AppConfig.maps">
      <ErrorHelm :is-error="isError">
        <div class="interactive-map-container brdr-4">
          <component
            :is="MapComponent"
            :css-class="cssClass"
            :origin="origin"
            :ctrl-key="[...ctrlKey, 'InteractiveMap']"
            @update:web-url="onWebUrlChange"
            @onerror="onMapError"
          />
        </div>
      </ErrorHelm>
      <div class="interactive-map-location mt-xs-2">
        <span class="interactive-map-location-icon mr-xs-2" />
        <span v-if="city" class="interactive-map-location-text">
          {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
        </span>
        <div v-else class="data-loading-stub text-data-loading" />
      </div>
      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'InteractiveMap', 'ClientFallback']" class="interactive-map-waiting-indicator my-xs-5" />
      </template>
    </ClientOnly>
    <div v-else class="interactive-map-disabled">
      {{ $t(getI18nResName2('maps', 'disabled')) }}
    </div>
  </div>
</template>
