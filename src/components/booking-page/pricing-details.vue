<script setup lang="ts" generic="TOffer extends EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>">
import sum from 'lodash-es/sum';
import { type ImageCategory, type IImageEntitySrc, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, type ILocalizableValue } from './../../shared/interfaces';
import { type I18nResName, getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import StaticImage from './../../components/images/static-image.vue';
import { getScoreClassResName, getLocalizeableValue } from './../../shared/common';
import { type Locale } from './../../shared/constants';
import PriceDecompositionItem from './price-decomposition-item.vue';

interface IProps {
  ctrlKey: string,
  imageEntitySrc?: IImageEntitySrc,
  category: ImageCategory,
  imageAltResName: I18nResName,
  priceDecompoisition: { labelResName: I18nResName, amount?: number }[],
  heading?: {
    sub: ILocalizableValue,
    main: ILocalizableValue,
    reviewScore: number,
    reviewsCount: number
  }
};
const props = withDefaults(defineProps<IProps>(), {
  imageEntitySrc: undefined,
  heading: undefined,
  priceDecompoisition: undefined
});

const { t, locale } = useI18n();

const scoreClassResName = computed(() => props.heading?.reviewScore ? getScoreClassResName(props.heading?.reviewScore) : undefined);
const reviewsCountText = computed(() => props.heading?.reviewsCount !== undefined ? `${props.heading?.reviewsCount} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), props.heading?.reviewsCount)}` : '');

</script>

<template>
  <section class="pricing-details brdr-3 p-xs-3 p-s-4">
    <div class="pricing-details-subject">
      <StaticImage
        :ctrl-key="`${ctrlKey}-StaticImg`"
        :show-stub="true"
        :is-high-priority="false"
        class="pricing-details-photo"
        img-class="pricing-details-photo-img"
        :entity-src="imageEntitySrc"
        :category="category"
        sizes="xs:40vw sm:30vw md:30vw lg:30vw xl:20vw"
        :alt-res-name="imageAltResName"
      />
      <div class="pricing-subject-info">
        <h2 v-if="heading?.sub" class="pricing-subject-heading-sub">
          {{ getLocalizeableValue(heading.sub, locale as Locale) }}
        </h2>
        <div v-else class="pricing-subject-heading-sub data-loading-stub text-data-loading" />
        <div v-if="heading?.main" class="pricing-subject-heading-main mt-xs-1">
          {{ getLocalizeableValue(heading.main, locale as Locale) }}
        </div>
        <div v-else class="pricing-subject-heading-main data-loading-stub text-data-loading mt-xs-1" />
        <div class="pricing-subject-info-stats mb-xs-3 mb-s-0 mt-xs-3">
          <div v-if="heading?.reviewScore" class="pricing-subject-info-score p-xs-2 brdr-1">
            {{ heading?.reviewScore?.toFixed(1) }}
          </div>
          <div v-else class="pricing-subject-info-score" :style="{ visibility: 'hidden' }" />
          <div v-if="scoreClassResName" class="pricing-subject-info-score-class">
            {{ $t(scoreClassResName) }}
          </div>
          <div v-else class="pricing-subject-info-score-class data-loading-stub text-data-loading" />
          <div v-if="reviewsCountText" class="pricing-subject-info-score-reviews">
            {{ reviewsCountText }}
          </div>
          <div v-else class="pricing-subject-info-score-reviews data-loading-stub text-data-loading" />
        </div>
      </div>
    </div>
    <hr class="pricing-details-section-separator">
    <div class="pricing-details-payment-protected">
      <i18n-t :keypath="getI18nResName2('bookingCommon', 'bookingProtected')" tag="div" class="pricing-details-payment-protected" scope="global">
        <template #by>
          <span style="font-weight: bold;">{{ $t(getI18nResName2('bookingCommon', 'protectedBy')) }}</span>
        </template>
      </i18n-t>
    </div>
    <hr class="pricing-details-section-separator">
    <div class="pricing-details-decomposition">
      <h4 class="pricing-details-decomposition-caption">
        {{ $t(getI18nResName3('bookingCommon', 'pricingDecomposition', 'caption')) }}
      </h4>
      <ol class="pricing-details-decomposition-list mt-xs-3">
        <PriceDecompositionItem v-for="(item, idx) in priceDecompoisition" :key="`${ctrlKey}-${idx}`" :ctrl-key="`${ctrlKey}-${idx}`" :label-res-name="item.labelResName" :amount="item.amount" />
      </ol>
      <hr class="pricing-details-section-separator">
      <PriceDecompositionItem :ctrl-key="`${ctrlKey}-Total`" :label-res-name="getI18nResName3('bookingCommon', 'pricingDecomposition', 'total')" :amount="props.priceDecompoisition[0].amount ? sum(props.priceDecompoisition.map(i => i.amount!)) : undefined" :style="{ display: 'block' }" />
    </div>
  </section>
</template>
