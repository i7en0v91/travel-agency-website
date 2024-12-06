<script setup lang="ts">
import { AppPage, type Locale, getLocalizeableValue, type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  offerKind?: OfferKind | undefined,
  city?: EntityDataAttrsOnly<ICity> | undefined,
  placeName?: ILocalizableValue | undefined
};
const props = withDefaults(defineProps<IProps>(), {
  offerKind: undefined,
  city: undefined,
  placeName: undefined
});

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const links = computed(() => [{
  label: props.city ? getLocalizeableValue(props.city.country.name, locale.value as Locale) : undefined,
  to: props.city ? (props.offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale.value as Locale)) : undefined,
  external: false
}, {
  label: props.city ? getLocalizeableValue(props.city.name, locale.value as Locale) : undefined,
  to: props.city ? (props.offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale, { fromCitySlug: props.city.slug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale, { citySlug: props.city.slug })) : undefined,
  external: false
}, {
  label: props.placeName ? getLocalizeableValue(props.placeName, locale.value as Locale) : undefined
}]);

</script>

<template>
  <UBreadcrumb :links="links">
    <template v-if="links.some(l => !l.label?.length)" #default>
      <USkeleton class="w-[10lvw] h-3" />
    </template>
  </UBreadcrumb>
</template>
