<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type OfferKind, type Locale, AppPage, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import type { ITravelDetailsTextingData, ISearchFlightOffersMainParams, ISearchStayOffersMainParams } from './../../../types';
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

const styleClass = computed(() => {
  if (!texting) {
    return isInitial ? 'z-[2]' : 'invisible';
  }
  return 'z-[3]';
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

const uiStyling = {
  base: 'w-full h-full flex flex-col flex-nowrap gap-0 items-stretch',
  background: 'bg-transparent dark:bg-transparent',
  shadow: 'shadow-none',
  rounded: 'rounded-2xl',
  divide: 'divide-none',
  header: {
    base: 'flex-grow-0 flex-shrink basis-auto h-auto'
  },
  footer: {
    base: 'flex-grow-0 flex-shrink basis-auto h-min'
  },
  body: {
    base: 'flex-grow flex-shrink basis-auto h-full overflow-x-hidden overflow-y-auto mx-1'
  },
};


</script>

<template>
  <div :class="`w-full h-[31.625rem] travelsmd:h-full md:h-[20.375rem] xl:h-full row-start-1 row-end-2 col-start-1 col-end-2 z-[1] rounded-2xl ${styleClass}`">
    <UCard as="div" :ui="uiStyling">
      <template #header>
        <UBadge 
          v-if="price" 
          :ui="{ 
            base: 'ml-2 mt-1 mb-2 inline float-right min-w-[90px] text-center',
            rounded: 'rounded-lg' 
          }"
          size="md"
        >
          {{ $t(getI18nResName2('travelDetails', 'priceFrom')) }}
          {{ `\$${price}` }}
        </UBadge>
        <USkeleton v-else class="w-[50px] h-3 mt-1" />
        <h3 v-if="texting?.header" class="w-full inline break-words text-4xl font-bold">
          {{ (texting.header as any)[locale] }}
        </h3>
        <USkeleton v-else class="w-1/2 h-9 mt-2" />
      </template>

      <p v-if="texting?.text" class="w-full h-full">
        {{ (texting?.text as any)[locale] }}
      </p>

      <template #footer>
        <UButton size="lg" class="w-full justify-center" variant="solid" color="primary" :to="bookLinkUrl" :external="false" @click="onBookBtnClick">
          {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
        </UButton>
      </template>
    </UCard>
  </div>
</template>
