<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppPage, type Locale, getLocalizeableValue, type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  offerKind?: OfferKind,
  city?: EntityDataAttrsOnly<ICity>,
  placeName?: ILocalizableValue
};
const { city, offerKind, placeName } = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const links = computed(() => [{
  label: city ? getLocalizeableValue(city.country.name, locale.value as Locale) : '',
  to: city ? (offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale.value as Locale)) : undefined,
  external: false
}, {
  label: city ? getLocalizeableValue(city.name, locale.value as Locale) : '',
  to: city ? (offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale, { fromCitySlug: city.slug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale, { citySlug: city.slug })) : undefined,
  external: false
}, {
  label: placeName ? getLocalizeableValue(placeName, locale.value as Locale) : '',
}]);

</script>

<template>
  <UBreadcrumb :links="links">
    <template v-if="links.some(l => !l.label?.length)" #default>
      <USkeleton class="w-[10lvw] h-3" />
    </template>
  </UBreadcrumb>
</template>
