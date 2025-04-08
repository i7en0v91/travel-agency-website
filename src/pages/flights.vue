<script setup lang="ts">
import { AppException, AppExceptionCodeEnum, UserNotificationLevel, type IEntityCacheCityItem, FlightsTitleSlug, ImageCategory, type EntityId, getI18nResName2 } from '@golobe-demo/shared';
import { TravelDetailsHtmlAnchor } from './../helpers/constants';
import HeadingText from './../components/flights/flights-heading-text.vue';
import { getCommonServices } from '../helpers/service-accessors';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  title: { resName: getI18nResName2('flightsPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'Flights'];

const logger = getCommonServices().getLogger().addContextProps({ component: 'Flights' });

const userNotificationStore = useUserNotificationStore();
const entityCacheStore = useEntityCacheStore();
const travelDetailsStore = useTravelDetailsStore();

function scrollToTravelDetailsSection () {
  const sectionElement = document.getElementById(TravelDetailsHtmlAnchor)!;
  sectionElement.scrollIntoView({
    block: 'center',
    behavior: 'smooth'
  });
}

async function getCityFromUrl (): Promise<IEntityCacheCityItem | undefined> {
  const route = router.currentRoute.value;
  logger.debug(`parsing city from url`, { query: route.query });

  const citySlug = route.query?.citySlug?.toString();
  if (!citySlug) {
    logger.debug('city slug parameter was not specified', { query: route.query });
    return undefined;
  }

  let cacheResult: IEntityCacheCityItem[] = [];
  try {
    cacheResult = await entityCacheStore.get({ slugs: [citySlug] }, 'City', true);
  } catch(err: any) {
    logger.warn(`exception occured looking up city by slug`, err, { slug: citySlug });
    if(import.meta.client) {
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName2('appErrors', 'unknown')
      });
      return undefined;  
    }
  }
  
  if (!cacheResult || cacheResult.length === 0) {
    logger.warn(`city not found`, undefined, { slug: citySlug });
    if(import.meta.client) {
      userNotificationStore.show({
        level: UserNotificationLevel.WARN,
        resName: getI18nResName2('appErrors', 'objectNotFound')
      });
      return undefined;
    } else {
      logger.warn('failed to lookup city by slug', undefined, { slug: citySlug });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'city not found', 'error-page');
    }
  }

  const result = cacheResult[0];
  logger.debug(`city from url parsed`, { query: route.query, id: result.id });
  return result;
}


function displayCity (cityId: EntityId) {
  logger.verbose('setting displayed city', { id: cityId });
  travelDetailsStore.setDisplayingCity(cityId);
  scrollToTravelDetailsSection();
  logger.verbose('setting displayed city', { id: cityId });
}

async function displayCityFromUrl (): Promise<void> {
  const route = useRoute();
  logger.verbose('updating displayed city from url', { url: route.fullPath, query: route.query });
  const cityFromUrl = await getCityFromUrl();
  if (!cityFromUrl) {
    logger.debug('no city from url retrieved');
    return;
  }

  const currentlyDisplayedCity = travelDetailsStore.current;
  if (currentlyDisplayedCity?.cityId === cityFromUrl.id) {
    logger.verbose('city from url equals to currently displayed', { id: cityFromUrl.id });
    return;
  }

  logger.verbose('setting city to display from url', { id: cityFromUrl.id });
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
      :ctrl-key="[...CtrlKey, 'SearchPageHead']"
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
      <HeadingText :ctrl-key="[...CtrlKey, 'SearchPageHead', 'Title']" />
    </SearchPageHead>

    <AppPageMdc />
  </div>
</template>
