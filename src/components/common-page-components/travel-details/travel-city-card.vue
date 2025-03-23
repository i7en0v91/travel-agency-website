<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { getCommonServices } from '../../../helpers/service-accessors';
import type { ISearchFlightOffersMainParams, ISearchStayOffersMainParams } from './../../../types';
import { type OfferKind, AppPage, getI18nResName3, type IImageEntitySrc, type ILocalizableValue, ImageCategory, type Locale } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay',
  cityName?: ILocalizableValue,
  promoLine?: ILocalizableValue,
  promoPrice?: number,
  citySlug?: string,
  imgSrc?: IImageEntitySrc
};
const { 
  ctrlKey, 
  cityName = undefined, 
  promoLine = undefined, 
  promoPrice = undefined, 
  citySlug = undefined, 
  bookKind = undefined 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelCityCard' });

const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

const offersSearchLink = computed (() => 
  citySlug ? (
    bookKind === 'flight' ? 
      navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale, { fromCitySlug: citySlug }) : 
      navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale, { citySlug })
  ) : 
  navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale)
);

async function onBookBtnClick(): Promise<void> {
  logger.debug('book btn click', { ctrlKey, bookKind, citySlug });
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
  <article class="travel-city-card">
    <div class="travel-city-card-dim brdr-3" />
    <div class="travel-city-card-details p-xs-4">
      <div class="travel-city-card-texts">
        <div class="travel-city-card-place-info">
          <h3 :class="`${cityName ? '' : 'data-loading-stub text-data-loading'} font-h4`">
            {{ cityName ? (cityName as any)[locale] : '&nbsp;' }}
          </h3>
          <div :class="promoLine ? '' : 'data-loading-stub text-data-loading mt-xs-1'">
            {{ promoLine ? (promoLine as any)[locale] : '&nbsp;' }}
          </div>
        </div>
        <div :class="promoPrice ? 'travel-city-card-price' : 'data-loading-stub text-data-loading travel-city-card-price'">
          {{ promoPrice ? `$ ${promoPrice}` : '&nbsp;' }}
        </div>
      </div>
      <NuxtLink class="btn btn-primary brdr-1 mt-xs-3 no-hidden-parent-tabulation-check" :to="offersSearchLink" @click="onBookBtnClick">
        {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
      </NuxtLink>
    </div>
    <StaticImage
      :ctrl-key="[...ctrlKey, 'StaticImg', 'City']"
      :src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
      :category="ImageCategory.CityCard"
      sizes="xs:90vw sm:80vw md:60vw lg:50vw xl:50vw"
      class="travel-city-card-img brdr-3"
      :alt="{ resName: getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt') }"
      stub="default"
    />
  </article>
</template>
