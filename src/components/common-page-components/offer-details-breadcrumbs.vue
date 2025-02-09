<script setup lang="ts">
import { AppPage, type Locale, getLocalizeableValue, getI18nResName2, type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  offerKind?: OfferKind,
  city?: EntityDataAttrsOnly<ICity>,
  placeName?: ILocalizableValue
};
defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

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
        <NuxtLink v-if="city" class="brdr-1 tabbable" :to="offerKind === 'flights' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: city.slug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug: city.slug })">
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
