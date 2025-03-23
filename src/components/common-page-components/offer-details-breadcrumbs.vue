<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getCommonServices } from './../../helpers/service-accessors';
import { AppPage, type Locale, getLocalizeableValue, getI18nResName2, type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from '@golobe-demo/shared';
import type { ISearchFlightOffersMainParams, ISearchStayOffersMainParams } from './../../types';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  offerKind?: OfferKind,
  city?: EntityDataAttrsOnly<ICity>,
  placeName?: ILocalizableValue
};
const { ctrlKey, offerKind = undefined, city = undefined } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'OfferDetailsBreadcrumbs' });
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

async function onSearchBtnClick(): Promise<void> {
  logger.debug('search btn click', { ctrlKey, offerKind, slug: city?.slug });
  const citySlug = city?.slug;
  if(offerKind && citySlug) {
    const searchOffersStore = useSearchOffersStore();

    const entityCacheStore = useEntityCacheStore();
    const items = await entityCacheStore!.get({ slugs: [citySlug!] }, 'City', true);
    const cityId = items[0].id;

    const mainParams = offerKind === 'flights' ?
      { fromCityId: cityId } as Partial<ISearchFlightOffersMainParams> :
      { cityId }  as Partial<ISearchStayOffersMainParams>;

    logger.debug('offer search params computed', { ctrlKey, mainParams });
    await searchOffersStore.load(offerKind, { overrideParams: mainParams });
  }
}

</script>

<template>
  <nav id="nav-offer-breadcrumbs" :aria-label="$t(getI18nResName2('ariaLabels', 'navOfferBreadcrumbs'))" class="offer-details-breadcrumbs-nav">
    <ol class="offer-details-breadcrumbs">
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" class="brdr-1 tabbable" :to="offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale as Locale)">
          {{ getLocalizeableValue(city.country.name, locale as Locale) }}
        </NuxtLink>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" class="brdr-1 tabbable" :to="offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: city.slug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug: city.slug })" @click="onSearchBtnClick">
          {{ getLocalizeableValue(city.name, locale as Locale) }}
        </NuxtLink>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
      <li class="offer-details-breadcrumb">
        <div v-if="placeName">
          {{ getLocalizeableValue(placeName, locale as Locale) }}
        </div>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
    </ol>
  </nav>
</template>
