<script setup lang="ts">

import PageSection from './../components/common-page-components/page-section.vue';
import HeadingText from './../components/flights/flights-heading-text.vue';
import { getI18nResName1, getI18nResName2, getI18nResName3 } from './../shared/i18n';
import { ImageCategory, type EntityId } from './../shared/interfaces';
import { FlightsTitleSlug } from './../shared/constants';
import WorldMap from './../components/flights/world-map.vue';
import TravelCities from './../components/common-page-components/travel-cities.vue';
import TravelDetails from './../components/common-page-components/travel-details.vue';
import { useTravelDetailsStore } from './../stores/travel-details-store';

definePageMeta({
  title: getI18nResName2('flightsPage', 'title')
});

const TravelDetailsAnchor = 'flightsTravelDetails';

const travelDetailsStore = useTravelDetailsStore();
function onCityFocused (cityId: EntityId) {
  travelDetailsStore.setDisplayingCity(cityId);
  const sectionElement = document.getElementById(TravelDetailsAnchor)!.offsetTop;
  window.scrollTo({ top: sectionElement, behavior: 'smooth' });
}

</script>

<template>
  <div class="flights-page no-hidden-parent-tabulation-check">
    <SearchPageHead
      ctrl-key="SearchPageHeadFlights"
      class="flights-page-head"
      :image-entity-src="{ slug: FlightsTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName1('searchPageImageAlt')"
      single-tab="flights"
    >
      <HeadingText ctrl-key="FlightsPageHeading" />
    </SearchPageHead>
    <PageSection
      ctrl-key="LetGoPlacesSection"
      :header-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'title')"
      :subtext-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'subtext')"
      :btn-text-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'btn')"
      :content-padded="false"
    >
      <WorldMap ctrl-key="WorldMap" @city-focused="onCityFocused" />
    </PageSection>
    <TravelCities ctrl-key="FlightsTravelCitiesSection" />
    <TravelDetails :id="TravelDetailsAnchor" ctrl-key="FlightsTravelDetailsSection" />
  </div>
</template>
