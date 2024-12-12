<script setup lang="ts">
import { FlightsTitleSlug, ImageCategory, type EntityId, getI18nResName2 } from '@golobe-demo/shared';
import { TravelDetailsHtmlAnchor } from './../helpers/constants';
import HeadingText from './../components/flights/flights-heading-text.vue';
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
  <div class="flights-page">
    <SearchPageHead
      ctrl-key="SearchPageHeadFlights"
      :image-entity-src="{ slug: FlightsTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      single-tab="flights"
      :ui="{
        content: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
        image: {
          wrapper: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
          img: 'max-h-[701px] md:max-h-[581px]',
          overlay: 'bg-gradient-to-b from-gray-700 to-60% opacity-75'
        }
      }"
    >
      <HeadingText ctrl-key="FlightsPageHeading" />
    </SearchPageHead>

    <AppPageMdc />
  </div>
</template>
