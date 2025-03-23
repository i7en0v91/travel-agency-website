<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getCommonServices } from './../../helpers/service-accessors';
import { AppPage, type Locale, getLocalizeableValue, type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from '@golobe-demo/shared';
import type { ISearchFlightOffersMainParams, ISearchStayOffersMainParams } from './../../types';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  offerKind?: OfferKind,
  city?: EntityDataAttrsOnly<ICity>,
  placeName?: ILocalizableValue
};
const { ctrlKey, offerKind = undefined, city = undefined, placeName = undefined } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'OfferDetailsBreadcrumbs' });
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const links = computed(() => [{
  label: city ? getLocalizeableValue(city.country.name, locale.value as Locale) : '',
  to: city ? (offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale.value as Locale)) : undefined,
  external: false
}, {
  label: city ? getLocalizeableValue(city.name, locale.value as Locale) : '',
  to: city ? (offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale, { fromCitySlug: city.slug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale, { citySlug: city.slug })) : undefined,
  external: false,
  click: onSearchBtnClick
}, {
  label: placeName ? getLocalizeableValue(placeName, locale.value as Locale) : '',
}]);

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
  <UBreadcrumb :links="links">
    <template v-if="links.some(l => !l.label?.length)" #default>
      <USkeleton class="w-[10lvw] h-3" />
    </template>
  </UBreadcrumb>
</template>
