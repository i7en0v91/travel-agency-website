<script setup lang="ts">

import type { GeoPoint, EntityDataAttrsOnly, ICity } from './../../shared/interfaces';
import AppConfig from './../../appconfig';
import InteractiveMap from './../common-page-components/map/interactive-map.vue';
import { getI18nResName3 } from './../../shared/i18n';
import { type Locale } from './../../shared/constants';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import { AppPage } from './../../shared/page-query-params';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

const { t, locale } = useI18n();

interface IProps {
  ctrlKey: string,
  visibility: 'wait' | 'visible',
  location?: GeoPoint,
  city?: EntityDataAttrsOnly<ICity>
}

defineProps<IProps>();

const navLinkBuilder = useNavLinkBuilder();

const webUrl = ref<string>();

</script>

<template>
  <section class="stay-details-map">
    <div class="stay-details-map-heading">
      <h2 class="stay-details-map-title  mt-xs-1">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'title')) }}
      </h2>
      <NuxtLink v-if="!!AppConfig.maps" class="btn btn-primary stay-details-map-weblink brdr-1  mt-xs-1" :to="webUrl ?? navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="true" target="_blank">
        {{ $t(getI18nResName3('stayDetailsPage', 'location', 'viewOnWebsite'), { webLink: t(AppConfig.maps.providerDisplayResName) }) }}
      </NuxtLink>
    </div>
    <ComponentWaitingIndicator v-if="!location || visibility === 'wait'" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="interactive-map-waiting-indicator my-xs-5" />
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
