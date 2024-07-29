<script setup lang="ts">

import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import orderBy from 'lodash-es/orderBy';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import { getLocalizeableValue, getScoreClassResName } from '../../shared/common';
import { type Locale } from '../../shared/constants';
import type { EntityDataAttrsOnly, IStayDescription } from './../../shared/interfaces';
import { getI18nResName3, getI18nResName2 } from './../../shared/i18n';

const { t, locale } = useI18n();

interface IProps {
  ctrlKey: string,
  description?: EntityDataAttrsOnly<IStayDescription>[],
  numReviews?: number,
  reviewScore?: number
}

const props = withDefaults(defineProps<IProps>(), {
  description: undefined,
  numReviews: undefined,
  reviewScore: undefined
});

const titleStr = computed(() => props.description?.find(d => d.paragraphKind === 'Title')?.textStr);
const mainStr = computed(() => props.description?.find(d => d.paragraphKind === 'Main')?.textStr);
const featureStrs = computed(() => {
  const featureStrs = props.description?.filter(d => d.paragraphKind === 'FeatureCaption' || d.paragraphKind === 'FeatureText');
  if (!featureStrs) {
    return undefined;
  }
  const ordered = orderBy(featureStrs, ['order'], ['asc']);
  return zip(range(0, Math.floor(ordered.length / 2)).map(idx => ordered![2 * idx]), range(0, Math.floor(ordered.length / 2)).map(idx => ordered![2 * idx + 1])).map((f) => {
    return {
      caption: f[0]!.textStr,
      text: f[1]!.textStr
    };
  });
});

const highlightResNames = ['newPark', 'nightlife', 'theater', 'clean'];
const scoreClassResName = computed(() => props.reviewScore ? getScoreClassResName(props.reviewScore) : undefined);
const reviewsCountText = computed(() => props.numReviews ? `${props.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), props.numReviews)}` : undefined);

</script>

<template>
  <section class="stay-details-overview">
    <h2 v-if="titleStr" class="stay-details-overview-heading">
      {{ getLocalizeableValue(titleStr, locale as Locale) }}
    </h2>
    <div v-else class="data-loading-stub text-data-loading" />
    <p v-if="mainStr" class="stay-details-overview-main mt-xs-3">
      {{ getLocalizeableValue(mainStr, locale as Locale) }}
    </p>
    <ul v-if="featureStrs?.length ?? 0" class="stay-details-overview-features mt-xs-3">
      <li v-for="(feature, idx) in featureStrs" :key="`${ctrlKey}-Feature-${idx}`" class="stay-details-overview-feature">
        <div class="stay-feature-checkmark brdr-1" />
        <div class="stay-feature-texting">
          <span class="stay-feature-caption">
            {{ getLocalizeableValue(feature.caption, locale as Locale) }}:&nbsp;
          </span>
          {{ getLocalizeableValue(feature.text, locale as Locale) }}
        </div>
      </li>
    </ul>
    <div class="stay-details-overview-highlights-div mt-xs-5">
      <PerfectScrollbar
        :options="{
          suppressScrollY: true,
          wheelPropagation: true
        }"
        :watch-options="false"
        tag="div"
        class="stay-details-overview-highlights-scroll"
      >
        <ul class="stay-details-overview-highlights pb-xs-3">
          <li class="stay-details-highlight-item p-xs-3 brdr-3">
            <ClientOnly>
              <div v-if="props.reviewScore" class="stay-details-highlight-score">
                {{ props.reviewScore.toFixed(1) }}
              </div>
              <div v-else class="stay-details-highlight-score data-loading-stub text-data-loading" />
              <div class="stay-details-highlight-summary">
                <div v-if="scoreClassResName" class="stay-highlight-review-class">
                  {{ $t(scoreClassResName) }}
                </div>
                <div v-else class="stay-highlight-review-class data-loading-stub text-data-loading" />
                <div v-if="numReviews !== undefined" class="stay-highlight-reviews-count mt-xs-1">
                  {{ reviewsCountText }}
                </div>
                <div v-else class="stay-highlight-reviews-count data-loading-stub text-data-loading mt-xs-1" />
              </div>
              <!-- KB: fallback freezes in production...
              <template #fallback>
                <div class="stay-details-highlight-score data-loading-stub text-data-loading" />
                <div class="stay-details-highlight-summary">
                  <div class="stay-highlight-review-class data-loading-stub text-data-loading" />
                  <div class="stay-highlight-reviews-count data-loading-stub text-data-loading mt-xs-1" />
                </div>
              </template>
              -->
            </ClientOnly>
          </li>
          <li v-for="(resName, idx) in highlightResNames" :key="`${ctrlKey}-Highlight-${idx}`" class="stay-details-highlight-item p-xs-3 brdr-3">
            <div class="stay-details-highlight-icon" />
            <div v-if="reviewScore" class="stay-details-highlight-text">
              {{ $t(getI18nResName3('stayDetailsPage', 'overviewHightlights', resName as any)) }}
            </div>
            <div v-else class="stay-details-highlight-text data-loading-stub text-data-loading" />
          </li>
        </ul>
      </PerfectScrollbar>
    </div>
  </section>
</template>
