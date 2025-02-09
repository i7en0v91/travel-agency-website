<script setup lang="ts" generic="TOffer extends EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>">
import { type Locale, getScoreClassResName, getLocalizeableValue, type I18nResName, getI18nResName2, getI18nResName3, type ReviewSummary, type ImageCategory, type IImageEntitySrc, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, type ILocalizableValue } from '@golobe-demo/shared';
import StaticImage from './../../components/images/static-image.vue';
import sum from 'lodash-es/sum';
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
    reviewSummary?: ReviewSummary
  }
};

const { 
  heading,
  imageEntitySrc,
  priceDecompoisition
} = defineProps<IProps>();

const { t, locale } = useI18n();

const scoreClassResName = computed(() => heading?.reviewSummary?.score ? getScoreClassResName(heading?.reviewSummary.score) : undefined);
const reviewsCountText = computed(() => heading?.reviewSummary?.numReviews !== undefined ? `${heading?.reviewSummary.numReviews} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), heading?.reviewSummary.numReviews)}` : '');

const isError = ref(false);

const uiStyling = {
  base: 'w-full h-full overflow-hidden grid sm:gap-x-6 sm:gap-y-0 grid-rows-bookingpricingxs grid-cols-bookingpricingxs sm:grid-rows-bookingpricingsm sm:grid-cols-bookingpricingsm',
  background: 'bg-transparent dark:bg-transparent',
  shadow: 'shadow-none',
  rounded: 'rounded-none',
  divide: 'divide-none',
  ring: '!ring-0',
  header: {
    base: 'contents'
  },
  body: {
    base: 'contents'
  },
  footer: {
    base: 'hidden'
  }
};


</script>

<template>
  <ErrorHelm v-model:is-error="isError" :ui="{ stub: 'max-h-[50vh]' }">
    <section class="w-full h-auto bg-white dark:bg-gray-900 shadow-lg shadow-gray-200 dark:shadow-gray-700 rounded-2xl px-4 py-5 sm:px-6">
      <UCard as="article" :ui="uiStyling">
        <template #header>
          <div class="w-full h-auto mt-4 sm:mt-0 row-start-2 row-end-3 col-start-1 col-end-2 sm:row-start-1 sm:row-end-2 sm:col-start-2 sm:col-end-3">
            <h2 v-if="heading?.sub" class="w-full h-auto break-words text-sm sm:text-base font-normal text-gray-600 dark:text-gray-300">
              {{ getLocalizeableValue(heading.sub, locale as Locale) }}
            </h2>
            <USkeleton v-else class="w-full h-4 sm:h-6" />
            <div v-if="heading?.main" class="w-full h-auto break-words text-xl font-semibold text-primary-900 dark:text-white mt-1">
              {{ getLocalizeableValue(heading.main, locale as Locale) }}
            </div>
            <USkeleton v-else class="w-1/2 h-7 mt-2" />
          </div>
        </template>

        <div class="w-full h-auto row-start-1 row-end-2 col-start-1 col-end-2 sm:row-start-1 sm:row-end-3">
          <StaticImage
            :ctrl-key="`${ctrlKey}-StaticImg`"
            :show-stub="true"
            :is-high-priority="false"
            :ui="{ wrapper: 'w-full h-full aspect-auto sm:w-[120px] sm:h-[120px] rounded-xl', img: 'rounded-xl object-cover' }"
            :entity-src="imageEntitySrc"
            :category="category"
            sizes="xs:40vw sm:30vw md:30vw lg:30vw xl:20vw"
            :alt-res-name="imageAltResName"
          />
        </div>

        <div class="w-full h-min row-start-3 row-end-4 col-start-1 col-end-2 sm:row-start-2 sm:row-end-3 sm:col-start-2 sm:col-end-3 flex flex-row flex-wrap items-start justify-between gap-2">
          <div class="w-full sm:mb-0 mt-4">
            <ClientOnly>
              <div class="flex flex-row flex-wrap items-center gap-2 justify-start">
                <UBadge 
                  v-if="heading?.reviewSummary?.score"
                  :ui="{ 
                    base: 'w-fit h-auto p-2 text-center',
                    rounded: 'rounded-md'
                  }"
                  size="sm"
                >
                  {{ heading?.reviewSummary.score.toFixed(1) }}
                </UBadge>
                <USkeleton v-else class="w-full h-4" />
                <div v-if="scoreClassResName" class="w-fit h-auto text-xs font-semibold">
                  {{ $t(scoreClassResName) }}
                </div>
                <USkeleton v-else class="w-1/2 h-3" />
                <div v-if="reviewsCountText" class="w-fit h-auto text-xs text-gray-500 dark:text-gray-400">
                  {{ reviewsCountText }}
                </div>
                <USkeleton v-else class="w-1/2 h-3" />
              </div>

              <template #fallback>
                <USkeleton class="w-full h-4" />
              </template>
            </ClientOnly>  
          </div>
        </div>
      </UCard>
      <UDivider orientation="horizontal" class="w-full my-4" size="2xs" :ui="{ border: { base: 'border-primary-200 dark:border-primary-700' } }"/>

      <div class="w-full h-auto text-sm sm:text-base text-gray-600 dark:text-gray-300">
        <i18n-t :keypath="getI18nResName2('bookingCommon', 'bookingProtected')" tag="div" scope="global">
          <template #by>
            <span style="font-weight: bold;">{{ $t(getI18nResName2('bookingCommon', 'protectedBy')) }}</span>
          </template>
        </i18n-t>
      </div>
      <UDivider orientation="horizontal" class="w-full my-4" size="2xs" :ui="{ border: { base: 'border-primary-200 dark:border-primary-700' } }"/>

      <div class="w-full h-auto text-sm sm:text-base text-gray-600 dark:text-gray-300">
        <h4 class="font-semibold break-words">
          {{ $t(getI18nResName3('bookingCommon', 'pricingDecomposition', 'caption')) }}
        </h4>
        <ul class="w-full font-normal break-words mt-4 space-y-2">
          <PriceDecompositionItem v-for="(item, idx) in priceDecompoisition" :key="`${ctrlKey}-${idx}`" :ctrl-key="`${ctrlKey}-${idx}`" :label-res-name="item.labelResName" :amount="item.amount" />
        </ul>
        <UDivider orientation="horizontal" class="w-full my-4" size="2xs" :ui="{ border: { base: 'border-primary-200 dark:border-primary-700' } }"/>
        <PriceDecompositionItem :ctrl-key="`${ctrlKey}-Total`" :label-res-name="getI18nResName3('bookingCommon', 'pricingDecomposition', 'total')" :amount="priceDecompoisition[0].amount ? sum(priceDecompoisition.map(i => i.amount!)) : undefined" />
      </div>
    </section>
  </ErrorHelm>
</template>
