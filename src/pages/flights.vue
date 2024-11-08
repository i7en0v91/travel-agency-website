<script setup lang="ts">
import { FlightsTitleSlug, ImageCategory, type EntityId, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { TravelDetailsHtmlAnchor } from './../helpers/constants';
import PageSection from './../components/common-page-components/page-section.vue';
import HeadingText from './../components/flights/flights-heading-text.vue';
import WorldMap from './../components/flights/world-map.vue';
import TravelCities from './../components/common-page-components/travel-details/travel-cities.vue';
import TravelDetails from './../components/common-page-components/travel-details/travel-details.vue';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  title: { resName: getI18nResName2('flightsPage', 'title'), resArgs: undefined }
});
useOgImage();

const logger = getCommonServices().getLogger();

const travelDetailsStore = useTravelDetailsStore();
function scrollToTravelDetailsSection () {
  const sectionElement = document.getElementById(TravelDetailsHtmlAnchor)!;
  sectionElement.scrollIntoView({
    block: 'center',
    behavior: 'smooth'
  });
}

function displayCity (cityId: EntityId) {
  logger.verbose(`(Flights) setting displayed city, id=${cityId}`);
  travelDetailsStore.setDisplayingCity(cityId);
  scrollToTravelDetailsSection();
  logger.verbose(`(Flights) setting displayed city, id=${cityId}, exit`);
}

async function displayCityFromUrl (): Promise<void> {
  const route = useRoute();
  logger.verbose(`(Flights) updating displayed city from url, url=${route.fullPath}, query=${JSON.stringify(route.query)}`);
  const cityFromUrl = await travelDetailsStore.getCityFromUrl();
  if (!cityFromUrl) {
    logger.debug('(Flights) no city from url retrieved');
    return;
  }

  const currentlyDisplayedCity = (await travelDetailsStore.getInstance()).current;
  if (currentlyDisplayedCity?.cityId === cityFromUrl.id) {
    logger.verbose(`(Flights) city from url equals to currently displayed, id=${cityFromUrl.id}`);
    return;
  }

  logger.verbose(`(Flights) setting city to display from url, id=${cityFromUrl.id}`);
  await displayCity(cityFromUrl.id);
}

const router = useRouter();
onMounted(() => {
  displayCityFromUrl();
  if (router.currentRoute.value.hash?.includes(TravelDetailsHtmlAnchor)) {
    scrollToTravelDetailsSection();
  }
  watch(router.currentRoute, () => {
    displayCityFromUrl();
  });
});

</script>

<template>
  <div class="flights-page no-hidden-parent-tabulation-check">
    <!--
    <SearchPageHead
      ctrl-key="SearchPageHeadFlights"
      class="flights-page-head"
      :image-entity-src="{ slug: FlightsTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      overlay-class="search-flights-page-head-overlay"
      single-tab="flights"
    >
      <HeadingText ctrl-key="FlightsPageHeading" />
    </SearchPageHead>
    <PageSection
      ctrl-key="LetGoPlacesSectionFlights"
      :header-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'title')"
      :subtext-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'subtext')"
      :btn-text-res-name="getI18nResName3('flightsPage', 'letsGoPlacesSection', 'btn')"
      :content-padded="false"
    >
      <WorldMap ctrl-key="WorldMap" />
    </PageSection>
    <TravelCities ctrl-key="FlightsTravelCitiesSection" book-kind="flight" />
    <TravelDetails :id="TravelDetailsHtmlAnchor" ctrl-key="FlightsTravelDetailsSection" book-kind="flight" />
    -->
    PAGE CONTENT
  </div>
</template>
