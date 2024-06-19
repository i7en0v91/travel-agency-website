<script setup lang="ts">

import { type EntityDataAttrsOnly, type ICity, type ILocalizableValue, type OfferKind } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';
import { getLocalizeableValue } from './../../shared/common';
import { type Locale } from './../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';

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
const localePath = useLocalePath();

</script>

<template>
  <nav id="nav-offer-breadcrumbs" :aria-label="$t(getI18nResName2('ariaLabels', 'navOfferBreadcrumbs'))" class="offer-details-breadcrumbs-nav">
    <ol class="offer-details-breadcrumbs">
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" class="brdr-1 tabbable" :to="localePath(offerKind === 'flights' ? `/${getHtmlPagePath(HtmlPage.Flights)}` : `/${getHtmlPagePath(HtmlPage.Stays)}`)">
          {{ getLocalizeableValue(city.country.name, locale as Locale) }}
        </NuxtLink>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" class="brdr-1 tabbable" :to="localePath(offerKind === 'flights' ? `/${getHtmlPagePath(HtmlPage.FindFlights)}?fromCitySlug=${city.slug}` : `/${getHtmlPagePath(HtmlPage.FindStays)}?citySlug=${city.slug}`)">
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
