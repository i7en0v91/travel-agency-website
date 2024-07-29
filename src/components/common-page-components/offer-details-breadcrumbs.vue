<script setup lang="ts">

import { type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';
import { getLocalizeableValue } from './../../shared/common';
import { type Locale } from './../../shared/constants';
import { AppPage } from './../../shared/page-query-params';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  offerKind?: OfferKind | undefined,
  city?: EntityDataAttrsOnly<ICity> | undefined,
  placeName?: ILocalizableValue | undefined
};
withDefaults(defineProps<IProps>(), {
  offerKind: undefined,
  city: undefined,
  placeName: undefined
});

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
