<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type OfferKind, type Locale, AppPage, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import type { ITravelDetailsTextingData, ISearchFlightOffersMainParams, ISearchStayOffersMainParams } from './../../../types';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay',
  texting?: ITravelDetailsTextingData,
  isInitial?: boolean
};

const { 
  ctrlKey, 
  bookKind, 
  texting = undefined, 
  isInitial = undefined 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelDetailsTextingFrame' });
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const fadeIn = ref<boolean | undefined>(undefined);
const cssClass = computed(() => {
  if (!texting) {
    return isInitial ? 'initialized' : 'initializing';
  }
  return 'initialized loaded';
});

const bookLinkUrl = computed(() => {
  const citySlug = texting?.slug;
  if (!citySlug) {
    return navLinkBuilder.buildPageLink(bookKind === 'flight' ? AppPage.Flights : AppPage.Stays, locale.value as Locale);
  }
  return navLinkBuilder.buildPageLink(
    bookKind === 'flight' ? AppPage.FindFlights : AppPage.FindStays,
    locale.value as Locale,
    bookKind === 'flight' ? { fromCitySlug: citySlug } : { citySlug }
  );
});

const price = computed(() => texting?.price ? texting.price.toFixed(0) : undefined);

async function onBookBtnClick(): Promise<void> {
  logger.debug('book btn click', { ctrlKey, bookKind, slug: texting?.slug });
  const citySlug = texting?.slug;
  if(citySlug) {
    const searchOffersStore = useSearchOffersStore();
    const offersKind: OfferKind = bookKind === 'flight' ? 'flights' : 'stays';

    const entityCacheStore = useEntityCacheStore();
    const items = await entityCacheStore!.get({ slugs: [citySlug!] }, 'City', true);
    const cityId = items[0].id;

    const mainParams = offersKind === 'flights' ?
      { fromCityId: cityId } as Partial<ISearchFlightOffersMainParams> :
      { cityId }  as Partial<ISearchStayOffersMainParams>;

    logger.debug('travel city offers search params computed', { ctrlKey, mainParams });
    await searchOffersStore.load(offersKind, { overrideParams: mainParams });
  }
}

</script>

<template>
  <div :class="`travel-details-frame travel-details-texting-frame p-xs-4 brdr-4 ${cssClass}`">
    <div class="travel-details-texting-header">
      <div class="travel-details-texting-price brdr-2 p-xs-2 ml-xs-2">
        {{ $t(getI18nResName2('travelDetails', 'priceFrom')) }}
        <div :class="`${price ? 'travel-details-price-value' : 'data-loading-stub text-data-loading'} mt-xs-1`">
          {{ price ? `\$${price}` : '&nbsp;' }}
        </div>
      </div>
      <h3 v-if="texting?.header" class="travel-details-texting-title">
        {{ (texting.header as any)[locale] }}
      </h3>
      <div v-else class="data-loading-stub text-data-loading"> &nbsp; </div>
    </div>
    <PerfectScrollbar
      :options="{
        suppressScrollX: true,
        wheelPropagation: true
      }"
      :watch-options="false"
      tag="div"
      :class="texting?.text ? 'travel-details-texting-paragraph my-xs-3' : 'data-loading-stub text-data-loading'"
    >
      <p>
        {{ texting?.text ? (texting?.text as any)[locale] : '&nbsp;' }}
      </p>
    </PerfectScrollbar>
    <NuxtLink :class="`btn btn-primary brdr-1 travel-details-book-btn ${ (!fadeIn && !isInitial) ? '' : 'nontabbable' }`" :to="bookLinkUrl" @click="onBookBtnClick">
      {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
    </NuxtLink>
  </div>
</template>
