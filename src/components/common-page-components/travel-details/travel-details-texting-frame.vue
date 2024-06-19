<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type ITravelDetailsTextingData } from './../../../shared/interfaces';
import { getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import { HtmlPage, getHtmlPagePath } from './../../../shared/page-query-params';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay',
  texting?: ITravelDetailsTextingData,
  isInitial?: boolean
};

const props = withDefaults(defineProps<IProps>(), {
  texting: undefined,
  tabbable: undefined
});

const { locale } = useI18n();
const localePath = useLocalePath();

const fadeIn = ref<boolean | undefined>(undefined);
const cssClass = computed(() => {
  if (!props.texting) {
    return props.isInitial ? 'initialized' : 'initializing';
  }
  return 'initialized loaded';
});

const bookLinkUrl = computed(() => {
  const citySlug = props.texting?.slug;
  if (!citySlug) {
    return localePath(props.bookKind === 'flight' ? `/${getHtmlPagePath(HtmlPage.Flights)}` : `/${getHtmlPagePath(HtmlPage.Stays)}`);
  }
  return localePath(props.bookKind === 'flight' ? `/${getHtmlPagePath(HtmlPage.FindFlights)}?fromCitySlug=${citySlug}` : `/${getHtmlPagePath(HtmlPage.FindStays)}?citySlug=${citySlug}`);
});

</script>

<template>
  <div :class="`travel-details-frame travel-details-texting-frame p-xs-4 brdr-4 ${cssClass}`">
    <div class="travel-details-texting-header">
      <div class="travel-details-texting-price brdr-2 p-xs-2 ml-xs-2">
        {{ $t(getI18nResName2('travelDetails', 'priceFrom')) }}
        <div :class="`${texting?.price ? 'travel-details-price-value' : 'data-loading-stub text-data-loading'} mt-xs-1`">
          {{ texting?.price ? `\$${texting?.price}` : '&nbsp;' }}
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
    <NuxtLink :class="`btn btn-primary brdr-1 travel-details-book-btn ${ (!fadeIn && !isInitial) ? '' : 'nontabbable' }`" :to="bookLinkUrl">
      {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
    </NuxtLink>
  </div>
</template>
