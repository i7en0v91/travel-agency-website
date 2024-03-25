<script setup lang="ts">

import { getLocalizeableValue } from '../../shared/common';
import type { GeoPoint, MakeSearchResultEntity, ICity } from './../../shared/interfaces';
import { type Locale } from './../../shared/constants';
import AppConfig from './../../appconfig';
import InteractiveMap from './../common-page-components/map/interactive-map.vue';
import { getI18nResName3 } from './../../shared/i18n';
import ComponentWaiterIndicator from './../component-waiting-indicator.vue';

const { locale } = useI18n();

interface IProps {
  ctrlKey: string,
  visibility: 'wait' | 'visible',
  location?: GeoPoint,
  city?: MakeSearchResultEntity<ICity>
}

defineProps<IProps>();

const localePath = useLocalePath();

const webUrl = ref<string>();

</script>

<template>
  <section class="stay-details-map">
    <div class="stay-details-map-heading">
      <div class="stay-details-map-title  mt-xs-1" role="heading" aria-level="5">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'title')) }}
      </div>
      <NuxtLink v-if="AppConfig.maps" class="btn btn-primary stay-details-map-weblink brdr-1  mt-xs-1" :to="webUrl ?? localePath('/')" target="_blank">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'viewOnWebsite'), { webLink: getLocalizeableValue(AppConfig.maps.providerDisplayName, locale as Locale) }) }}
      </NuxtLink>
    </div>
    <ComponentWaiterIndicator v-if="!location || visibility === 'wait'" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="interactive-map-waiting-indicator my-xs-5" />
    <InteractiveMap
      v-else
      v-model:webUrl="webUrl"
      :ctrl-key="`${ctrlKey}-InteractiveMap`"
      :origin="location"
      :city="city"
      css-class="stay-details-map-class"
      class="mt-xs-5 brdr-4"
    />
  </section>
</template>
